from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.services.climate import fetch_climate
from app.services.geocoding import geocode

router = APIRouter(prefix="/api/climate", tags=["Climate"])


class ClimateResponse(BaseModel):
    district_name: str
    avg_humidity: float | None
    rainy_days_per_year: int | None
    avg_temp_celsius: float | None
    sunshine_hours_per_year: float | None


@router.get("/{district}", response_model=ClimateResponse)
async def get_climate(
    district: str,
    _: str = Depends(get_current_user),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
):
    if lat is None or lng is None:
        coords = await geocode(district)
        if not coords:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="District could not be geocoded",
            )
        lng, lat = coords

    climate_data = await fetch_climate(district, lat, lng)
    if not climate_data:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch climate data from Open-Meteo",
        )
    return ClimateResponse(district_name=district, **climate_data)
