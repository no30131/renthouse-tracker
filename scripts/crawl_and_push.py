#!/usr/bin/env python3
"""
本地爬蟲腳本：在本地（住宅 IP）執行物件抓取，推送到部署端 backend。

使用方式：
    cd renthouse/backend
    BACKEND_URL=https://你的網址.zeabur.app \
    BACKEND_USER=admin \
    BACKEND_PASS=你的密碼 \
    uv run python ../scripts/crawl_and_push.py
"""

import asyncio
import os
import sys

import httpx

# 把 backend app 加入 path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/backend")

from app import crawler_config as cc
from app.services.listing_provider import fetch_listings

BACKEND_URL = os.environ["BACKEND_URL"].rstrip("/")
BACKEND_USER = os.environ["BACKEND_USER"]
BACKEND_PASS = os.environ["BACKEND_PASS"]

_CITY_PREFIX = {1: "台北市", 3: "新北市"}


async def main():
    # 1. 抓取
    all_listings: list[dict] = []
    for region_id in cc.REGION_IDS:
        print(f"抓取 region={region_id} ...")
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
        city = _CITY_PREFIX.get(region_id, "")
        for item in partial:
            addr = item.get("address", "")
            if city and addr and not addr.startswith(("台北", "新北", "基隆", "桃園")):
                item["address"] = city + addr
        all_listings.extend(partial)
        print(f"  region={region_id} 抓到 {len(partial)} 筆")

    print(f"共 {len(all_listings)} 筆，推送到 {BACKEND_URL} ...")

    # 2. 登入取得 token
    async with httpx.AsyncClient(timeout=30) as client:
        login_res = await client.post(
            f"{BACKEND_URL}/api/auth/login",
            data={"username": BACKEND_USER, "password": BACKEND_PASS},
        )
        login_res.raise_for_status()
        token = login_res.json()["access_token"]

        # 3. 推送
        ingest_res = await client.post(
            f"{BACKEND_URL}/api/crawler/ingest",
            json={"listings": all_listings},
            headers={"Authorization": f"Bearer {token}"},
        )
        ingest_res.raise_for_status()
        result = ingest_res.json()

    print(f"完成：新增 {result['created']} 筆，更新 {result['updated']} 筆，略過 {result['skipped']} 筆")


if __name__ == "__main__":
    asyncio.run(main())
