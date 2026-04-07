import httpx
from shapely.geometry import Point, shape

from app.config import settings


async def fetch_isochrones(
    lng: float,
    lat: float,
    travel_mode: str = "driving",
    durations: list[int] = [20, 30, 40],
) -> list[dict]:
    """
    呼叫 Mapbox Isochrone API，一次取得多個時間門檻的多邊形。
    回傳 list of GeoJSON Feature，每個 feature 的 properties.contour 為分鐘數。
    travel_mode: "driving" | "cycling" | "walking"
    """
    url = (
        f"https://api.mapbox.com/isochrone/v1/mapbox/{travel_mode}"
        f"/{lng},{lat}"
    )
    params = {
        "contours_minutes": ",".join(str(d) for d in sorted(durations)),
        "polygons": "true",
        "access_token": settings.MAPBOX_TOKEN,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    return data.get("features", [])


def point_in_isochrone(lng: float, lat: float, isochrone_geojson: dict) -> bool:
    """判斷給定座標是否在等時圈多邊形內。"""
    polygon = shape(isochrone_geojson["geometry"])
    point = Point(lng, lat)
    return polygon.contains(point)
