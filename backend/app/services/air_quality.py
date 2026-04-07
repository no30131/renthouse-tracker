import httpx

# European AQI 等級
def aqi_level(aqi: int | None) -> tuple[str, str]:
    """回傳 (等級文字, hex 顏色)"""
    if aqi is None:
        return ("—", "#9ca3af")
    if aqi <= 20:
        return ("良好", "#22c55e")
    if aqi <= 40:
        return ("尚可", "#84cc16")
    if aqi <= 60:
        return ("普通", "#eab308")
    if aqi <= 80:
        return ("差", "#f97316")
    if aqi <= 100:
        return ("很差", "#ef4444")
    return ("極差", "#7c3aed")


# PM2.5 等級（WHO 2021 標準）
def pm25_level(pm25: float | None) -> tuple[str, str]:
    if pm25 is None:
        return ("—", "#9ca3af")
    if pm25 <= 15:
        return ("良好", "#22c55e")
    if pm25 <= 35:
        return ("普通", "#eab308")
    if pm25 <= 54:
        return ("不健康", "#f97316")
    return ("危害", "#ef4444")


async def fetch_air_quality(lat: float, lng: float) -> dict | None:
    """
    從 Open-Meteo Air Quality API 取得今日 PM2.5、PM10、AQI。
    回傳目前時刻附近的平均值（取最近 3 小時均值）。
    """
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = [
        ("latitude", lat),
        ("longitude", lng),
        ("hourly", "pm2_5"),
        ("hourly", "pm10"),
        ("hourly", "european_aqi"),
        ("hourly", "uv_index"),
        ("timezone", "Asia/Taipei"),
        ("forecast_days", 1),
    ]

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            return None
        data = resp.json()

    hourly = data.get("hourly", {})
    pm25_list = hourly.get("pm2_5", [])
    pm10_list = hourly.get("pm10", [])
    aqi_list = hourly.get("european_aqi", [])
    uv_list = hourly.get("uv_index", [])

    # 取非 None 的前 24 筆平均（今日）
    def avg(lst: list) -> float | None:
        vals = [v for v in lst[:24] if v is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    def max_val(lst: list) -> float | None:
        vals = [v for v in lst[:24] if v is not None]
        return round(max(vals), 1) if vals else None

    pm25 = avg(pm25_list)
    pm10 = avg(pm10_list)
    aqi = int(avg(aqi_list)) if avg(aqi_list) is not None else None
    uv_max = max_val(uv_list)

    aqi_label, aqi_color = aqi_level(aqi)
    pm25_label, pm25_color = pm25_level(pm25)

    return {
        "pm2_5": pm25,
        "pm10": pm10,
        "european_aqi": aqi,
        "aqi_label": aqi_label,
        "aqi_color": aqi_color,
        "pm25_label": pm25_label,
        "pm25_color": pm25_color,
        "uv_index_max": uv_max,
    }
