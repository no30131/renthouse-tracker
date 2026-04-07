from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.shape import from_shape, to_shape
from pydantic import BaseModel
from shapely.geometry import Point
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.air_quality import fetch_air_quality
from app.services.commute import get_commute as calculate_commute
from app.services.forecast import fetch_forecast
from app.services.geocoding import geocode, geocode_with_district

router = APIRouter(prefix="/api/preferences", tags=["Preferences"])


class PreferencesUpdate(BaseModel):
    wishlist: list[str] | None = None
    dislikes: list[str] | None = None
    company_label: str | None = None
    company_address: str | None = None
    commute_arrival_times: list[str] | None = None
    current_address: str | None = None


class PreferencesResponse(BaseModel):
    wishlist: list[str] | None
    dislikes: list[str] | None
    company_label: str | None
    company_address: str | None
    commute_arrival_times: list[str] | None
    current_address: str | None
    current_district: str | None
    current_lat: float | None = None
    current_lng: float | None = None

    model_config = {"from_attributes": True}


class CurrentResidenceCommuteItem(BaseModel):
    travel_mode: str
    arrival_time: Optional[str]
    estimated_time_mins: Optional[int]
    distance_km: Optional[float]
    calculated_at: str


def _get_user(db: Session, username: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _user_to_response(user: User) -> PreferencesResponse:
    lat, lng = None, None
    if user.current_coordinates:
        pt = to_shape(user.current_coordinates)
        lat, lng = pt.y, pt.x
    return PreferencesResponse(
        wishlist=user.wishlist,
        dislikes=user.dislikes,
        company_label=user.company_label,
        company_address=user.company_address,
        commute_arrival_times=user.commute_arrival_times,
        current_address=user.current_address,
        current_district=user.current_district,
        current_lat=lat,
        current_lng=lng,
    )


@router.get("", response_model=PreferencesResponse)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    return _user_to_response(_get_user(db, current_user))


@router.put("", response_model=PreferencesResponse)
async def update_preferences(
    body: PreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    user = _get_user(db, current_user)
    if body.wishlist is not None:
        user.wishlist = body.wishlist
    if body.dislikes is not None:
        user.dislikes = body.dislikes
    if "company_label" in body.model_fields_set:
        user.company_label = body.company_label
    if "company_address" in body.model_fields_set:
        user.company_address = body.company_address
        if body.company_address:
            coords = await geocode(body.company_address)
            user.company_coordinates = from_shape(Point(*coords), srid=4326) if coords else None
        else:
            user.company_coordinates = None
    if "commute_arrival_times" in body.model_fields_set:
        user.commute_arrival_times = body.commute_arrival_times
    if "current_address" in body.model_fields_set:
        user.current_address = body.current_address
        if body.current_address:
            result = await geocode_with_district(body.current_address)
            if result:
                lng, lat, district = result
                user.current_coordinates = from_shape(Point(lng, lat), srid=4326)
                user.current_district = district or None
            else:
                user.current_coordinates = None
                user.current_district = None
        else:
            user.current_coordinates = None
            user.current_district = None
        # 地址變更時清除通勤快取
        user.current_commute_cache = None
    db.commit()
    db.refresh(user)
    return _user_to_response(user)


@router.get("/current-residence/commute", response_model=list[CurrentResidenceCommuteItem])
def get_current_residence_commute(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    user = _get_user(db, current_user)
    return user.current_commute_cache or []


@router.post("/current-residence/commute/refresh", response_model=list[CurrentResidenceCommuteItem])
async def refresh_current_residence_commute(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    user = _get_user(db, current_user)
    if not user.current_coordinates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="尚未設定現居地址或 Geocoding 失敗，請先在設定頁面儲存現居地址",
        )
    if not user.company_coordinates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="尚未設定公司座標，請先在設定頁面儲存公司地址",
        )

    from datetime import time as dt_time
    current_pt = to_shape(user.current_coordinates)
    company_pt = to_shape(user.company_coordinates)
    origin = (current_pt.x, current_pt.y)
    destination = (company_pt.x, company_pt.y)

    raw_times: list[str] = user.commute_arrival_times or []
    arrival_times: list[dt_time] = []
    for t in raw_times:
        h, m = t.split(":")[:2]
        arrival_times.append(dt_time(int(h), int(m)))
    if not arrival_times:
        arrival_times = [dt_time(9, 0)]

    records = []
    now_str = datetime.utcnow().isoformat() + "Z"
    for arrival in arrival_times:
        for mode in ["DRIVE", "TWO_WHEELER"]:
            result = await calculate_commute(origin, destination, mode, arrival)
            if result:
                records.append({
                    "travel_mode": mode,
                    "arrival_time": arrival.strftime("%H:%M:%S"),
                    "estimated_time_mins": result["duration_mins"],
                    "distance_km": result["distance_km"],
                    "calculated_at": now_str,
                })

    user.current_commute_cache = records
    db.commit()
    return records


@router.get("/current-residence/air-quality")
async def get_current_residence_air_quality(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    user = _get_user(db, current_user)
    if not user.current_coordinates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="尚未設定現居地址",
        )
    pt = to_shape(user.current_coordinates)
    result = await fetch_air_quality(lat=pt.y, lng=pt.x)
    if result is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch air quality")
    return result


@router.get("/current-residence/forecast")
async def get_current_residence_forecast(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    user = _get_user(db, current_user)
    if not user.current_coordinates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="尚未設定現居地址，請先在設定頁面儲存現居地址",
        )
    pt = to_shape(user.current_coordinates)
    result = await fetch_forecast(lat=pt.y, lng=pt.x)
    if result is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch forecast")
    return result
