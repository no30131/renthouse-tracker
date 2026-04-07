from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import mapping, shape
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.isochrone import IsochroneCache
from app.models.user import User
from app.services.isochrone import fetch_isochrones

router = APIRouter(prefix="/api/isochrone", tags=["Isochrone"])

_TRAVEL_MODE = "driving"
_DURATIONS = [20, 30, 40]


def _get_user_with_coords(db: Session, username: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.company_address:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company address not set")
    if not user.company_coordinates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company coordinates not set; update preferences first")
    return user


async def _fetch_and_cache_all(db: Session, user: User) -> list[IsochroneCache]:
    """呼叫 Mapbox 一次取得所有 contour，批次寫入快取。"""
    company_pt = to_shape(user.company_coordinates)
    features = await fetch_isochrones(company_pt.x, company_pt.y, _TRAVEL_MODE, _DURATIONS)
    if not features:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch isochrones from Mapbox")

    # features[i].properties.contour 是對應的分鐘數
    feature_by_duration: dict[int, dict] = {}
    for f in features:
        mins = f.get("properties", {}).get("contour")
        if mins is not None:
            feature_by_duration[int(mins)] = f

    now = datetime.now(timezone.utc)
    caches = []

    for duration in _DURATIONS:
        feat = feature_by_duration.get(duration)
        if not feat:
            continue

        polygon_geom = from_shape(shape(feat["geometry"]), srid=4326)

        cache = db.query(IsochroneCache).filter(
            IsochroneCache.company_address_key == user.company_address,
            IsochroneCache.travel_mode == _TRAVEL_MODE,
            IsochroneCache.duration_mins == duration,
        ).first()

        if cache:
            cache.polygon = polygon_geom
            cache.generated_at = now
        else:
            cache = IsochroneCache(
                company_address_key=user.company_address,
                travel_mode=_TRAVEL_MODE,
                duration_mins=duration,
                polygon=polygon_geom,
                generated_at=now,
            )
            db.add(cache)

        caches.append(cache)

    db.commit()
    for c in caches:
        db.refresh(c)

    return caches


def _to_feature_collection(caches: list[IsochroneCache]) -> dict:
    features = [
        {
            "type": "Feature",
            "geometry": mapping(to_shape(c.polygon)),
            "properties": {
                "travel_mode": c.travel_mode,
                "duration_mins": c.duration_mins,
                "generated_at": c.generated_at.isoformat(),
            },
        }
        for c in sorted(caches, key=lambda c: c.duration_mins)
    ]
    return {"type": "FeatureCollection", "features": features}


@router.get("")
async def get_isochrone(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """取得公司地址的等時圈 FeatureCollection（20/30/40 分鐘，有快取則直接回傳）。"""
    user = _get_user_with_coords(db, current_user)

    caches = db.query(IsochroneCache).filter(
        IsochroneCache.company_address_key == user.company_address,
        IsochroneCache.travel_mode == _TRAVEL_MODE,
        IsochroneCache.duration_mins.in_(_DURATIONS),
    ).all()

    cached_durations = {c.duration_mins for c in caches if c.polygon is not None}
    if cached_durations != set(_DURATIONS):
        caches = await _fetch_and_cache_all(db, user)

    return _to_feature_collection(caches)


@router.post("/refresh")
async def refresh_isochrone(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """強制重新生成所有等時圈並更新快取。"""
    user = _get_user_with_coords(db, current_user)
    caches = await _fetch_and_cache_all(db, user)
    return _to_feature_collection(caches)
