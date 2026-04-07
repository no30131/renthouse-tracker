import uuid
from datetime import datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.shape import to_shape
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.commute import CommuteRecord
from app.models.house import House
from app.models.user import User
from app.services.commute import get_commute as calculate_commute

router = APIRouter(prefix="/api/houses", tags=["Commute"])


class CommuteResponse(BaseModel):
    id: uuid.UUID
    house_id: uuid.UUID
    company_label: str
    travel_mode: str
    arrival_time: Optional[time]
    estimated_time_mins: Optional[int]
    distance_km: Optional[float]
    calculated_at: datetime

    model_config = {"from_attributes": True}


class RefreshCommuteRequest(BaseModel):
    arrival_time: time = time(9, 0)


@router.get("/{house_id}/commute", response_model=list[CommuteResponse])
def get_commute(
    house_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    house = db.get(House, house_id)
    if not house:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")
    return house.commute_records


@router.post("/{house_id}/commute/refresh", response_model=list[CommuteResponse])
async def refresh_commute(
    house_id: uuid.UUID,
    body: RefreshCommuteRequest = RefreshCommuteRequest(),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    house = db.get(House, house_id)
    if not house:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")
    if not house.coordinates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="House has no coordinates; geocode it first")

    user = db.query(User).filter(User.username == current_user).first()
    if not user or not user.company_coordinates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company coordinates not set in preferences")

    house_pt = to_shape(house.coordinates)
    company_pt = to_shape(user.company_coordinates)
    origin = (house_pt.x, house_pt.y)
    destination = (company_pt.x, company_pt.y)
    # 取出所有抵達時間，若未設定則 fallback 到 request body 預設值
    from datetime import time as dt_time
    raw_times: list[str] = user.commute_arrival_times or []
    arrival_times: list[dt_time] = []
    for t in raw_times:
        h, m = t.split(":")[:2]
        arrival_times.append(dt_time(int(h), int(m)))
    if not arrival_times:
        arrival_times = [body.arrival_time]

    # 刪除舊記錄
    db.query(CommuteRecord).filter(CommuteRecord.house_id == house_id).delete()

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
    return db.query(CommuteRecord).filter(CommuteRecord.house_id == house_id).all()
