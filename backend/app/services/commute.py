from datetime import date, datetime, time, timezone, timedelta

import httpx

from app.config import settings

TW_TZ = timezone(timedelta(hours=8))


async def get_commute(
    origin: tuple[float, float],
    destination: tuple[float, float],
    travel_mode: str,
    departure_time: time,
) -> dict | None:
    """
    呼叫 Google Maps Routes API 計算通勤時間。

    travel_mode: "DRIVE" 或 "TWO_WHEELER"
    回傳 {"duration_mins": int, "distance_km": float} 或 None
    """
    now = datetime.now(TW_TZ)
    dt = datetime.combine(now.date(), departure_time, tzinfo=TW_TZ)
    if dt <= now:
        dt += timedelta(days=1)
    departure_iso = dt.isoformat()

    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    headers = {
        "X-Goog-Api-Key": settings.GOOGLE_API_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    }
    body: dict = {
        "origin": {"location": {"latLng": {"latitude": origin[1], "longitude": origin[0]}}},
        "destination": {"location": {"latLng": {"latitude": destination[1], "longitude": destination[0]}}},
        "travelMode": travel_mode,
    }
    # TRAFFIC_AWARE 才能搭配 departureTime；TWO_WHEELER 不支援此模式
    if travel_mode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"
        body["departureTime"] = departure_iso

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=body, headers=headers)
        if resp.status_code != 200:
            return None
        data = resp.json()

    routes = data.get("routes", [])
    if not routes:
        return None

    route = routes[0]
    duration_secs = int(route["duration"].rstrip("s"))
    distance_m = route["distanceMeters"]
    return {
        "duration_mins": round(duration_secs / 60),
        "distance_km": round(distance_m / 1000, 2),
    }
