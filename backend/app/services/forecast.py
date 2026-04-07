import httpx

# WMO weather code → 中文描述 + emoji
WMO_CODES: dict[int, tuple[str, str]] = {
    0: ("晴天", "☀️"),
    1: ("晴時多雲", "🌤️"),
    2: ("多雲", "⛅"),
    3: ("陰天", "☁️"),
    45: ("霧", "🌫️"),
    48: ("霧淞", "🌫️"),
    51: ("毛毛雨", "🌦️"),
    53: ("毛毛雨", "🌦️"),
    55: ("毛毛雨", "🌦️"),
    61: ("小雨", "🌧️"),
    63: ("中雨", "🌧️"),
    65: ("大雨", "🌧️"),
    71: ("小雪", "❄️"),
    73: ("中雪", "❄️"),
    75: ("大雪", "❄️"),
    80: ("陣雨", "🌦️"),
    81: ("中陣雨", "🌦️"),
    82: ("大陣雨", "🌦️"),
    95: ("雷陣雨", "⛈️"),
    96: ("雷暴夾冰雹", "⛈️"),
    99: ("強雷暴夾冰雹", "⛈️"),
}


async def fetch_forecast(lat: float, lng: float) -> list[dict] | None:
    """
    從 Open-Meteo 取得未來 3 天每日天氣預報。
    回傳 list of dict，每筆代表一天。
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,windspeed_10m_max,uv_index_max",
        "timezone": "Asia/Taipei",
        "forecast_days": 3,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return None
            data = resp.json()
    except Exception:
        return None

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    if not dates:
        return None

    results = []
    for i, date in enumerate(dates):
        code = daily.get("weather_code", [None] * 3)[i]
        desc, icon = WMO_CODES.get(code, ("—", "🌡️"))
        results.append({
            "date": date,
            "weathercode": code,
            "weather_desc": desc,
            "weather_icon": icon,
            "temp_max": daily.get("temperature_2m_max", [None] * 3)[i],
            "temp_min": daily.get("temperature_2m_min", [None] * 3)[i],
            "precipitation_probability": daily.get("precipitation_probability_max", [None] * 3)[i],
            "precipitation_mm": daily.get("precipitation_sum", [None] * 3)[i],
            "windspeed_max_kmh": daily.get("windspeed_10m_max", [None] * 3)[i],
            "uv_index_max": daily.get("uv_index_max", [None] * 3)[i],
        })

    return results
