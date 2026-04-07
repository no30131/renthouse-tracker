from datetime import datetime, timedelta, timezone

import httpx


# 行政區名稱 → 大概的經緯度對照（之後可改從 Geocoding 取）
DISTRICT_COORDS: dict[str, tuple[float, float]] = {
    "台北市中山區": (121.5329, 25.0631),
    "台北市信義區": (121.5654, 25.0330),
    # 可依需要擴充
}


async def fetch_climate(district: str, lat: float, lng: float) -> dict | None:
    """
    從 Open-Meteo API 取得過去 365 天的氣候統計。
    不需要 API 金鑰。
    """
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=365)

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "precipitation_sum,relative_humidity_2m_mean,temperature_2m_mean,sunshine_duration",
        "timezone": "Asia/Taipei",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    daily = data.get("daily", {})
    precipitation = daily.get("precipitation_sum", [])
    humidity = daily.get("relative_humidity_2m_mean", [])
    temperature = daily.get("temperature_2m_mean", [])
    sunshine = daily.get("sunshine_duration", [])  # seconds per day

    if not precipitation or not humidity:
        return None

    rainy_days = sum(1 for p in precipitation if p is not None and p > 1.0)
    valid_humidity = [h for h in humidity if h is not None]
    avg_humidity = round(sum(valid_humidity) / len(valid_humidity), 1) if valid_humidity else None

    valid_temp = [t for t in temperature if t is not None]
    avg_temp = round(sum(valid_temp) / len(valid_temp), 1) if valid_temp else None

    valid_sunshine = [s for s in sunshine if s is not None]
    # sunshine_duration 單位為秒，換算成小時，再乘以 365/實際天數 推估年總時數
    sunshine_hours = round(sum(valid_sunshine) / 3600, 0) if valid_sunshine else None

    return {
        "avg_humidity": avg_humidity,
        "rainy_days_per_year": rainy_days,
        "avg_temp_celsius": avg_temp,
        "sunshine_hours_per_year": sunshine_hours,
    }
