"""
驗證租屋物件是否仍在線上。

591 的下架頁面會 redirect 到其他頁，透過 follow_redirects=False
偵測 302/301 即可判斷下架，不需要 Playwright。
"""

import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
}

_SEMAPHORE = asyncio.Semaphore(5)  # 同時最多 5 個並發請求


async def _check_591(post_id: str) -> bool:
    """591 詳細頁若下架會 302 redirect；保持原 URL 回 200 → 仍在線。"""
    url = f"https://rent.591.com.tw/rent-detail-{post_id}.html"
    try:
        async with _SEMAPHORE:
            async with httpx.AsyncClient(
                headers=_HEADERS, timeout=15, follow_redirects=False
            ) as client:
                resp = await client.get(url)
                alive = resp.status_code == 200
                logger.debug("591 %s → HTTP %s → alive=%s", post_id, resp.status_code, alive)
                return alive
    except Exception as exc:
        logger.warning("591 check failed for %s: %s", post_id, exc)
        return True  # 無法確認時保守視為仍在線


async def _check_generic(url: str) -> bool:
    """通用：HEAD 請求，4xx → 下架，其餘視為在線。"""
    if not url:
        return True
    try:
        async with _SEMAPHORE:
            async with httpx.AsyncClient(
                headers=_HEADERS, timeout=15, follow_redirects=True
            ) as client:
                resp = await client.head(url)
                return resp.status_code < 400
    except Exception as exc:
        logger.warning("Generic check failed for %s: %s", url, exc)
        return True


async def check_listing_alive(source: str, source_id: str | None, url: str | None) -> bool:
    """回傳 True 代表仍在線，False 代表已下架。"""
    if source == "591" and source_id:
        return await _check_591(source_id)
    if url:
        return await _check_generic(url)
    return True  # 無資訊時保守視為在線
