import asyncio
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.models.user import User
from app.scheduler import crawler_status, run_crawler, save_listings

router = APIRouter(prefix="/api/crawler", tags=["Crawler"])

# 保持 task 的強參考，避免被 GC 提早回收
_background_tasks: set[asyncio.Task] = set()


@router.post("/run", status_code=status.HTTP_202_ACCEPTED)
async def trigger_crawler(_: User = Depends(get_current_user)):
    """手動觸發物件抓取（背景執行）。"""
    if crawler_status["running"]:
        raise HTTPException(status_code=409, detail="爬蟲已在執行中")
    task = asyncio.create_task(run_crawler())
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return {"status": "started"}


@router.get("/status")
def get_crawler_status(_: User = Depends(get_current_user)):
    """查詢爬蟲最近一次執行時間與結果。"""
    return crawler_status


class IngestPayload(BaseModel):
    listings: list[dict[str, Any]]


@router.post("/ingest", status_code=status.HTTP_200_OK)
async def ingest_listings(payload: IngestPayload, _: User = Depends(get_current_user)):
    """接收本地爬蟲推送的原始物件，進行過濾/geocoding/存檔。"""
    result = await save_listings(payload.listings)
    return result
