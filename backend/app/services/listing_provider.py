"""
租屋物件資料提供者介面

實作自動化抓取邏輯時，請在此模組實作 fetch_listings()，
並回傳符合以下 schema 的物件清單：

    [
        {
            "source":     str,           # 資料來源名稱
            "source_id":  str,           # 來源平台的物件 ID（用於去重）
            "title":      str,
            "address":    str,
            "district":   str | None,
            "rent_price": int | None,
            "floor":      str | None,
            "size_ping":  float | None,
            "url":        str | None,
            "raw_data":   dict | None,   # 原始 JSON，供除錯用
        },
        ...
    ]

排程由 scheduler.py 控制，預設停用（CRAWLER_ENABLED=false）。
啟用前請確認符合目標平台的使用條款。
"""

from typing import Any


async def fetch_listings(
    region_id: int,
    section_ids: list[int] | None = None,
    kind: str = "",
    rent_min: int = 0,
    rent_max: int = 0,
    area_min: int = 0,
    pet: bool = False,
    cook: bool = False,
    has_image: bool = True,
    max_pages: int = 3,
) -> list[dict[str, Any]]:
    """
    回傳符合條件的租屋物件清單。

    預設為空實作，請自行依目標平台實作抓取邏輯。
    """
    return []
