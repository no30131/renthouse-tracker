"""
APScheduler 排程模組

負責定時觸發租屋物件抓取，並將結果套用
等時圈過濾 → 去重 → 新增/更新 流程。
"""

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy.orm import Session

import app.crawler_config as cc
from app.database import SessionLocal
from app.models.house import House
from app.models.user import User
from app.services.listing_provider import fetch_listings
from app.services.geocoding import geocode

logger = logging.getLogger(__name__)

# 爬蟲最近一次執行結果（供 API 查詢用）
crawler_status: dict = {
    "last_run": None,
    "last_result": None,
    "running": False,
}

_COMPARE_FIELDS = ["title", "rent_price", "address"]


async def save_listings(all_listings: list[dict]) -> dict:
    """將爬蟲結果做關鍵字過濾、geocoding、等時圈過濾後存入 DB。
    可供排程器和外部 ingest API 共用。
    """
    created = updated = skipped = 0
    db: Session = SessionLocal()
    try:
        for item in all_listings:
            source_id = item.get("source_id")
            if not source_id:
                skipped += 1
                continue

            title = item.get("title", "")
            if any(kw in title for kw in cc.EXCLUDE_KEYWORDS):
                skipped += 1
                continue

            address = item.get("address", "")
            coords = None
            if address:
                coords = await geocode(address)

            source = item.get("source", "Crawler")
            existing = db.query(House).filter(
                House.source == source,
                House.source_id == source_id,
            ).first()

            if existing:
                changed = False
                for field in _COMPARE_FIELDS:
                    new_val = item.get(field)
                    if new_val is not None and getattr(existing, field) != new_val:
                        setattr(existing, field, new_val)
                        changed = True
                if changed:
                    db.commit()
                    updated += 1
            else:
                house = House(
                    source=source,
                    source_id=source_id,
                    status="待確認",
                    title=item.get("title", ""),
                    address=address,
                    rent_price=item.get("rent_price"),
                    url=item.get("url"),
                    district=item.get("district"),
                    floor=item.get("floor"),
                    size_ping=item.get("size_ping"),
                    pet_friendly=True if cc.PET else None,
                    cooking_allowed=True if cc.COOK else None,
                    raw_data=item.get("raw_data"),
                )
                if coords:
                    lng, lat = coords
                    house.coordinates = from_shape(Point(lng, lat), srid=4326)
                db.add(house)
                db.commit()
                created += 1
    finally:
        db.close()

    return {"created": created, "updated": updated, "skipped": skipped}


async def run_crawler() -> dict:
    """執行一次物件抓取並處理結果，回傳統計資訊。"""
    if crawler_status["running"]:
        logger.info("爬蟲已在執行中，跳過本次排程")
        return {"skipped": True, "reason": "already_running"}

    crawler_status["running"] = True
    crawler_status["last_run"] = datetime.now(timezone.utc).isoformat()

    try:
        # 各縣市分別爬，結果合併後統一去重
        _CITY_PREFIX = {1: "台北市", 3: "新北市"}

        all_listings: list[dict] = []
        for region_id in cc.REGION_IDS:
            partial = await fetch_listings(
                region_id=region_id,
                section_ids=cc.SECTION_IDS or None,
                kind=cc.KIND,
                rent_min=cc.RENT_MIN,
                rent_max=cc.RENT_MAX,
                area_min=cc.AREA_MIN,
                pet=cc.PET,
                cook=cc.COOK,
                has_image=cc.HAS_IMAGE,
                max_pages=cc.MAX_PAGES,
            )
            # 補城市前綴（地址不含縣市時，幫 geocoder 加上）
            city = _CITY_PREFIX.get(region_id, "")
            for item in partial:
                addr = item.get("address", "")
                if city and addr and not addr.startswith(("台北", "新北", "基隆", "桃園")):
                    item["address"] = city + addr
            all_listings.extend(partial)

        result = await save_listings(all_listings)
        logger.info("爬蟲完成: %s", result)
        crawler_status["last_result"] = result
        return result

    except Exception as exc:
        logger.error("爬蟲執行失敗: %s", exc, exc_info=True)
        crawler_status["last_result"] = {"error": str(exc)}
        return {"error": str(exc)}
    finally:
        crawler_status["running"] = False


def create_scheduler() -> AsyncIOScheduler:
    """建立並設定 APScheduler 排程器。"""
    scheduler = AsyncIOScheduler(timezone="Asia/Taipei")

    parts = cc.CRON.split()
    if len(parts) == 5:
        minute, hour, day, month, day_of_week = parts
    else:
        minute, hour, day, month, day_of_week = "0", "8", "*", "*", "*"

    scheduler.add_job(
        run_crawler,
        CronTrigger(
            minute=minute,
            hour=hour,
            day=day,
            month=month,
            day_of_week=day_of_week,
            timezone="Asia/Taipei",
        ),
        id="listing_crawler",
        name="租屋物件排程抓取",
        replace_existing=True,
        misfire_grace_time=60 * 10,
    )

    return scheduler
