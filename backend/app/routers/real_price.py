from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.real_price import RealPriceRecord, RealPriceSyncStatus
from app.services.real_price import run_sync

router = APIRouter(prefix="/api/real-price", tags=["RealPrice"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class SyncStatusResponse(BaseModel):
    status: str
    total_quarters: int
    done_quarters: int
    message: str | None
    started_at: datetime | None
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class YearlyStats(BaseModel):
    year: int
    price_min: float | None
    price_avg: float | None
    price_max: float | None
    avg_size_ping: float | None
    sample_count: int


class QueryResponse(BaseModel):
    county: str
    street: str
    transaction_type: str
    data: list[YearlyStats]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/sync", status_code=202)
async def trigger_sync(
    background_tasks: BackgroundTasks,
    years_back: int = Query(default=10, ge=1, le=10),
    counties: str = Query(default="", description="逗號分隔的縣市清單，例：台北市,新北市。空白代表全台（不建議）"),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    觸發背景下載任務，從政府開放資料下載過去 N 年的實價登錄資料。
    counties 可指定只下載特定縣市，避免下載不必要的資料浪費空間。
    立即回傳 202，任務在背景執行。
    """
    row = db.get(RealPriceSyncStatus, 1)
    if row and row.status == "running":
        return {"detail": "已有任務在執行中", "status": "running"}

    county_list = [c.strip() for c in counties.split(",") if c.strip()] or None
    background_tasks.add_task(run_sync, years_back, county_list)
    return {"detail": "下載任務已啟動", "status": "started"}


@router.get("/debug")
def debug_stats(
    county: str = Query(...),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """診斷用：回傳該縣市的資料筆數與範例路段名稱。"""
    total = db.query(RealPriceRecord).filter_by(county=county).count()
    samples = (
        db.query(RealPriceRecord.street)
        .filter_by(county=county)
        .distinct()
        .limit(20)
        .all()
    )
    return {
        "county": county,
        "total_records": total,
        "sample_streets": [r.street for r in samples],
    }


@router.get("/debug/csv-headers")
async def debug_csv_headers(_: str = Depends(get_current_user)):
    """
    診斷用：下載一個季度的 CSV，回傳實際欄位名稱與前 3 筆資料。
    """
    import csv, io
    from app.services.real_price import _build_quarters, _fetch_csv

    quarters = _build_quarters(2)

    for roc_year, q in quarters[:4]:
        season = f"{roc_year}S{q}"
        for county_code in ["f", "a"]:
            filename = f"{county_code}_lvr_land_a.csv"
            text = await _fetch_csv(season, filename)
            if not text:
                continue
            try:
                reader = csv.DictReader(io.StringIO(text))
                rows = []
                for i, row in enumerate(reader):
                    rows.append(dict(row))
                    if i >= 2:
                        break
                if not rows:
                    continue
                return {
                    "success": True,
                    "season": season,
                    "filename": filename,
                    "headers": list(rows[0].keys()),
                    "first_3_rows": rows,
                }
            except Exception:
                continue

    return {"success": False, "message": "所有季度皆下載失敗"}


@router.get("/sync/status", response_model=SyncStatusResponse)
def get_sync_status(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """查詢背景下載任務的執行進度。"""
    row = db.get(RealPriceSyncStatus, 1)
    if not row:
        return SyncStatusResponse(
            status="idle",
            total_quarters=0,
            done_quarters=0,
            message="尚未執行過同步",
            started_at=None,
            finished_at=None,
        )
    return row


@router.get("/query", response_model=list[QueryResponse])
def query_real_price(
    street: str = Query(..., description="路段名稱，例如：中山北路一段"),
    county: str = Query(..., description="縣市，例如：台北市"),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    查詢指定縣市 + 路段近 10 年的實價登錄統計。
    分別回傳 BUY（買賣每坪單價）與 RENT（每坪月租金 + 平均坪數）。
    """
    results = []
    for tx_type in ("BUY", "RENT"):
        rows = (
            db.query(
                RealPriceRecord.year,
                func.min(RealPriceRecord.price_min).label("price_min"),
                func.avg(RealPriceRecord.price_avg).label("price_avg"),
                func.max(RealPriceRecord.price_max).label("price_max"),
                func.avg(RealPriceRecord.avg_size_ping).label("avg_size_ping"),
                func.sum(RealPriceRecord.sample_count).label("sample_count"),
            )
            .filter(
                RealPriceRecord.county == county,
                RealPriceRecord.street.ilike(f"%{street}%"),
                RealPriceRecord.transaction_type == tx_type,
            )
            .group_by(RealPriceRecord.year)
            .order_by(RealPriceRecord.year)
            .all()
        )

        if not rows:
            continue

        yearly = [
            YearlyStats(
                year=r.year,
                price_min=round(r.price_min, 0) if r.price_min else None,
                price_avg=round(r.price_avg, 0) if r.price_avg else None,
                price_max=round(r.price_max, 0) if r.price_max else None,
                avg_size_ping=round(r.avg_size_ping, 1) if r.avg_size_ping else None,
                sample_count=int(r.sample_count),
            )
            for r in rows
        ]

        results.append(QueryResponse(
            county=county,
            street=street,
            transaction_type=tx_type,
            data=yearly,
        ))

    return results
