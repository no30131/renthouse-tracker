import httpx

from app.config import settings


async def geocode(address: str) -> tuple[float, float] | None:
    """
    將文字地址轉換為 (lng, lat) 座標。
    回傳 None 代表找不到結果。
    """
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params={"address": address, "key": settings.GOOGLE_API_KEY, "language": "zh-TW"})
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") != "OK" or not data.get("results"):
        return None

    location = data["results"][0]["geometry"]["location"]
    return location["lng"], location["lat"]


def extract_district(address: str, geocode_result: dict) -> str | None:
    """從 Google Geocoding 結果中解析行政區，回傳「縣市+區」格式（如「新北市林口區」）。"""
    components = geocode_result.get("address_components", [])
    city = None
    district = None
    for component in components:
        types = component.get("types", [])
        if "administrative_area_level_1" in types:
            city = component.get("long_name")
        if "administrative_area_level_2" in types:
            district = component.get("long_name")
    if city and district:
        return f"{city}{district}"
    return district or None


async def geocode_with_district(address: str) -> tuple[float, float, str | None] | None:
    """
    將文字地址轉換為 (lng, lat, district)。
    回傳 None 代表找不到結果。
    """
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params={"address": address, "key": settings.GOOGLE_API_KEY, "language": "zh-TW"})
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") != "OK" or not data.get("results"):
        return None

    result = data["results"][0]
    location = result["geometry"]["location"]
    district = extract_district(address, result)
    return location["lng"], location["lat"], district
