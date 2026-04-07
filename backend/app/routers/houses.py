import uuid
from datetime import datetime, time
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from geoalchemy2.shape import from_shape, to_shape
from pydantic import BaseModel, HttpUrl
from shapely.geometry import Point
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import SessionLocal, get_db
from app.models.commute import CommuteRecord
from app.models.house import House
from app.models.user import User
from app.services.air_quality import fetch_air_quality
from app.services.commute import get_commute as calculate_commute
from app.services.forecast import fetch_forecast
from app.services.geocoding import extract_district, geocode_with_district
from app.services.scraper import scrape_url

router = APIRouter(prefix="/api/houses", tags=["Houses"])


# ---------- Schemas ----------

class HouseCreate(BaseModel):
    source: str = "Manual"
    source_id: Optional[str] = None
    url: Optional[str] = None
    title: str
    address: str
    district: Optional[str] = None
    rent_price: Optional[int] = None
    size_ping: Optional[float] = None
    floor: Optional[str] = None
    management_fee: Optional[int] = None
    pet_friendly: Optional[bool] = None
    cooking_allowed: Optional[bool] = None
    status: str = "考慮中"
    user_rating: Optional[int] = None
    notes: Optional[str] = None


class ScrapeRequest(BaseModel):
    url: HttpUrl


class HouseUpdate(BaseModel):
    title: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    url: Optional[str] = None
    rent_price: Optional[int] = None
    size_ping: Optional[float] = None
    floor: Optional[str] = None
    management_fee: Optional[int] = None
    pet_friendly: Optional[bool] = None
    cooking_allowed: Optional[bool] = None
    status: Optional[str] = None
    user_rating: Optional[int] = None
    notes: Optional[str] = None


class HouseResponse(BaseModel):
    id: uuid.UUID
    source: str
    title: str
    address: str
    district: Optional[str]
    rent_price: Optional[int]
    size_ping: Optional[float]
    floor: Optional[str]
    management_fee: Optional[int]
    pet_friendly: Optional[bool]
    cooking_allowed: Optional[bool]
    status: str
    user_rating: Optional[int]
    notes: Optional[str]
    url: Optional[str]
    created_at: datetime
    updated_at: datetime
    lat: Optional[float] = None
    lng: Optional[float] = None
    min_distance_km: Optional[float] = None
    min_commute_mins: Optional[int] = None

    model_config = {"from_attributes": True}


# ---------- Background Task ----------

async def _geocode_and_commute(house_id: uuid.UUID, username: str) -> None:
    """建檔後背景執行：geocoding + 通勤計算。"""
    db = SessionLocal()
    try:
        house = db.get(House, house_id)
        if not house:
            return

        # Geocoding
        coords = await geocode_with_district(house.address)
        if coords:
            lng, lat, district = coords
            house.coordinates = from_shape(Point(lng, lat), srid=4326)
            if district and not house.district:
                house.district = district
            db.commit()
            db.refresh(house)

        if not house.coordinates:
            return

        house_pt = to_shape(house.coordinates)

        # 通勤計算
        user = db.query(User).filter(User.username == username).first()
        if not user or not user.company_coordinates:
            return

        company_pt = to_shape(user.company_coordinates)
        origin = (house_pt.x, house_pt.y)
        destination = (company_pt.x, company_pt.y)

        raw_times: list[str] = user.commute_arrival_times or []
        arrival_times: list[time] = []
        for t in raw_times:
            h, m = t.split(":")[:2]
            arrival_times.append(time(int(h), int(m)))
        if not arrival_times:
            arrival_times = [time(9, 0)]

        for arrival in arrival_times:
            for mode in ["DRIVE", "TWO_WHEELER"]:
                result = await calculate_commute(origin, destination, mode, arrival)
                if result:
                    db.add(CommuteRecord(
                        house_id=house_id,
                        company_label=user.company_label or "",
                        travel_mode=mode,
                        arrival_time=arrival,
                        estimated_time_mins=result["duration_mins"],
                        distance_km=result["distance_km"],
                    ))
        db.commit()
    except Exception as e:
        print(f"[background] geocode_and_commute error for house {house_id}: {e}")
    finally:
        db.close()


# ---------- Endpoints ----------

@router.post("/scrape")
async def scrape_house(
    body: ScrapeRequest,
    _: str = Depends(get_current_user),
):
    """Fetch a rental listing URL and return pre-filled house fields."""
    result = await scrape_url(str(body.url))
    return result


@router.get("", response_model=list[HouseResponse])
def list_houses(
    status: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    min_rent: Optional[int] = Query(None),
    max_rent: Optional[int] = Query(None),
    pet_friendly: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    dist_sub = (
        db.query(
            CommuteRecord.house_id,
            func.min(CommuteRecord.distance_km).label("min_dist"),
            func.min(CommuteRecord.estimated_time_mins).label("min_mins"),
        )
        .group_by(CommuteRecord.house_id)
        .subquery()
    )
    q = db.query(House, dist_sub.c.min_dist, dist_sub.c.min_mins).outerjoin(
        dist_sub, House.id == dist_sub.c.house_id
    )
    if status:
        q = q.filter(House.status == status)
    if district:
        q = q.filter(House.district == district)
    if min_rent is not None:
        q = q.filter(House.rent_price >= min_rent)
    if max_rent is not None:
        q = q.filter(House.rent_price <= max_rent)
    if pet_friendly is not None:
        q = q.filter(House.pet_friendly == pet_friendly)
    return [_house_response(h, dist, mins) for h, dist, mins in q.order_by(House.created_at.desc()).all()]


@router.post("", response_model=HouseResponse, status_code=status.HTTP_201_CREATED)
async def create_house(
    body: HouseCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    house = House(**body.model_dump())
    db.add(house)
    db.commit()
    db.refresh(house)
    background_tasks.add_task(_geocode_and_commute, house.id, current_user)
    return house


def _house_response(house: "House", min_distance_km: Optional[float] = None, min_commute_mins: Optional[int] = None) -> HouseResponse:
    data = HouseResponse.model_validate(house)
    if house.coordinates:
        pt = to_shape(house.coordinates)
        data.lat = pt.y
        data.lng = pt.x
    data.min_distance_km = min_distance_km
    data.min_commute_mins = min_commute_mins
    return data


@router.get("/{house_id}", response_model=HouseResponse)
def get_house(
    house_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    house = db.get(House, house_id)
    if not house:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")
    return _house_response(house)


@router.patch("/{house_id}", response_model=HouseResponse)
def update_house(
    house_id: uuid.UUID,
    body: HouseUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    house = db.get(House, house_id)
    if not house:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")
    address_changed = "address" in body.model_fields_set and body.address != house.address
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(house, field, value)
    if address_changed:
        house.coordinates = None
    db.commit()
    db.refresh(house)
    if address_changed:
        background_tasks.add_task(_geocode_and_commute, house.id, current_user)
    return house


@router.post("/{house_id}/geocode")
async def geocode_house(
    house_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """
    手動觸發單筆物件的 geocoding + 通勤計算（同步執行，錯誤直接回傳）。
    適用於建檔時 background task 失敗、或舊資料補填的情境。
    """
    house = db.get(House, house_id)
    if not house:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    # Geocoding
    coords = await geocode_with_district(house.address)
    if not coords:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Google Geocoding API 找不到此地址", "address": house.address},
        )

    lng, lat, district = coords
    house.coordinates = from_shape(Point(lng, lat), srid=4326)
    if district and not house.district:
        house.district = district
    db.commit()
    db.refresh(house)

    # 通勤計算（若無公司座標則跳過）
    commute_results = []
    user = db.query(User).filter(User.username == current_user).first()
    if user and user.company_coordinates:
        from datetime import time as dtime
        from app.models.commute import CommuteRecord
        db.query(CommuteRecord).filter(CommuteRecord.house_id == house_id).delete()
        house_pt = to_shape(house.coordinates)
        company_pt = to_shape(user.company_coordinates)
        origin = (house_pt.x, house_pt.y)
        destination = (company_pt.x, company_pt.y)
        raw_times: list[str] = user.commute_arrival_times or []
        arrival_times_calc: list[dtime] = []
        for t in raw_times:
            h, m = t.split(":")[:2]
            arrival_times_calc.append(dtime(int(h), int(m)))
        if not arrival_times_calc:
            arrival_times_calc = [dtime(9, 0)]
        for arrival in arrival_times_calc:
            for mode in ["DRIVE", "TWO_WHEELER"]:
                result = await calculate_commute(origin, destination, mode, arrival)
                if result:
                    db.add(CommuteRecord(
                        house_id=house_id,
                        company_label=user.company_label or "",
                        travel_mode=mode,
                        arrival_time=arrival,
                        estimated_time_mins=result["duration_mins"],
                        distance_km=result["distance_km"],
                    ))
                    commute_results.append({"mode": mode, **result})
        db.commit()

    return {
        "status": "ok",
        "coordinates": {"lng": lng, "lat": lat},
        "district": district,
        "commute": commute_results,
    }


@router.get("/{house_id}/air-quality")
async def get_house_air_quality(
    house_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    house = db.get(House, house_id)
    if not house or not house.coordinates:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House or coordinates not found")
    pt = to_shape(house.coordinates)
    result = await fetch_air_quality(lat=pt.y, lng=pt.x)
    if result is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch air quality")
    return result


@router.get("/{house_id}/forecast")
async def get_house_forecast(
    house_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    house = db.get(House, house_id)
    if not house or not house.coordinates:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House or coordinates not found")
    pt = to_shape(house.coordinates)
    result = await fetch_forecast(lat=pt.y, lng=pt.x)
    if result is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch forecast")
    return result


@router.delete("/{house_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_house(
    house_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    house = db.get(House, house_id)
    if not house:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")
    db.delete(house)
    db.commit()
