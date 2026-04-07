"""
實價登錄資料同步服務。
資料來源：內政部不動產交易實價查詢服務網開放資料（免費、免 API Key）
  買賣 (A 檔)：每坪單價（元/平方公尺 → 換算成元/坪）
  租賃 (B 檔)：每坪月租金（元/坪）、建物移轉總面積平方公尺
"""

import asyncio
import csv
import io
import logging
import re
import sys
import uuid
from datetime import datetime, timezone

csv.field_size_limit(sys.maxsize)  # 政府 CSV 部分欄位超過預設 131072 上限

import httpx
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.real_price import RealPriceRecord, RealPriceSyncStatus

logger = logging.getLogger(__name__)

DOWNLOAD_SEASON_URL = "https://plvr.land.moi.gov.tw/DownloadSeason"
SQM_TO_PING = 0.3025  # 1 平方公尺 = 0.3025 坪

_HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://plvr.land.moi.gov.tw/DownloadOpenData",
}

# 縣市代碼對應（內政部開放資料用英文代碼）
COUNTY_CODES: dict[str, str] = {
    "A": "台北市",
    "B": "台中市",
    "C": "基隆市",
    "D": "台南市",
    "E": "高雄市",
    "F": "新北市",
    "G": "宜蘭縣",
    "H": "桃園市",
    "I": "嘉義市",
    "J": "新竹縣",
    "K": "苗栗縣",
    "M": "南投縣",
    "N": "彰化縣",
    "O": "新竹市",
    "P": "雲林縣",
    "Q": "嘉義縣",
    "T": "屏東縣",
    "U": "花蓮縣",
    "V": "台東縣",
    "W": "金門縣",
    "X": "澎湖縣",
    "Z": "連江縣",
}


def _roc_to_ce(roc_year: int) -> int:
    """民國年轉西元年"""
    return roc_year + 1911


def _build_quarters(years_back: int = 10) -> list[tuple[int, int]]:
    """
    產生過去 N 年的 (民國年, 季度) 列表，由新到舊。
    目前季度以當前月份推算。
    """
    now = datetime.now(timezone.utc)
    ce_year = now.year
    current_quarter = (now.month - 1) // 3 + 1
    roc_year = ce_year - 1911

    quarters = []
    q, y = current_quarter, roc_year
    for _ in range(years_back * 4):
        quarters.append((y, q))
        q -= 1
        if q == 0:
            q = 4
            y -= 1
    return quarters


async def _fetch_csv(season: str, filename: str) -> str | None:
    """
    用 httpx 直接下載 DownloadSeason CSV 檔案，回傳解碼後字串。
    URL 格式：https://plvr.land.moi.gov.tw/DownloadSeason?season=114S1&fileName=f_lvr_land_a.csv
    """
    params = {"season": season, "fileName": filename}
    try:
        async with httpx.AsyncClient(headers=_HTTP_HEADERS, timeout=60, follow_redirects=True) as client:
            resp = await client.get(DOWNLOAD_SEASON_URL, params=params)
        if resp.status_code != 200:
            logger.warning(f"下載失敗 {season}/{filename}: HTTP {resp.status_code}")
            return None
        ct = resp.headers.get("content-type", "")
        if "html" in ct:
            logger.warning(f"政府網站回傳 HTML（非 CSV）: {season}/{filename}")
            return None
        return resp.content.decode("utf-8-sig", errors="replace")
    except Exception as e:
        logger.warning(f"httpx 下載失敗 {season}/{filename}: {e}")
    return None


_STREET_RE = re.compile(
    r"([\u4e00-\u9fff\w]+(?:路|街|大道|Avenue|Blvd)"
    r"(?:(?:一|二|三|四|五|六|七|八|九|十)段)?)"
)


def _extract_street(address: str) -> str:
    """從完整地址（如 新北市汐止區汐平路二段123號）擷取路段名稱。"""
    m = _STREET_RE.search(address)
    return m.group(1) if m else ""


def _get(row: dict, *keys: str) -> str:
    """嘗試多個可能的欄位名稱，回傳第一個非空值。"""
    for k in keys:
        v = row.get(k, "").strip()
        if v:
            return v
    return ""



def _parse_buy_csv(text: str, county: str, year: int, quarter: int) -> list[RealPriceRecord]:
    """
    解析買賣 CSV (lvr_land_A)。
    從 土地位置建物門牌 擷取路段，取 單價元平方公尺 換算每坪單價。
    """
    reader = csv.DictReader(io.StringIO(text))
    buckets: dict[str, list[float]] = {}

    for row in reader:
        address = _get(row, "土地位置建物門牌", "路名")
        street = _extract_street(address)
        price_str = _get(row, "單價元平方公尺", "單價元/平方公尺")
        if not street or not price_str:
            continue
        try:
            price_sqm = float(price_str.replace(",", ""))
        except ValueError:
            continue
        if price_sqm <= 0:
            continue
        price_ping = price_sqm / SQM_TO_PING  # 元/坪
        buckets.setdefault(street, []).append(price_ping)

    records = []
    for street, prices in buckets.items():
        if not prices:
            continue
        records.append(RealPriceRecord(
            id=str(uuid.uuid4()),
            transaction_type="BUY",
            county=county,
            street=street,
            year=year,
            quarter=quarter,
            price_min=round(min(prices), 0),
            price_avg=round(sum(prices) / len(prices), 0),
            price_max=round(max(prices), 0),
            avg_size_ping=None,
            sample_count=len(prices),
        ))
    return records


def _parse_rent_csv(text: str, county: str, year: int, quarter: int) -> list[RealPriceRecord]:
    """
    解析租賃 CSV (lvr_land_C)。
    price_min/avg/max = 實際月租金總額（元/月，來自 總額元）
    avg_size_ping     = 平均坪數（來自 建物總面積平方公尺）
    """
    reader = csv.DictReader(io.StringIO(text))
    buckets: dict[str, list[tuple[float, float]]] = {}  # street → [(total_rent, size_ping)]

    for row in reader:
        address = _get(row, "土地位置建物門牌", "租賃住址", "路名")
        street = _extract_street(address)
        rent_str = _get(row, "總額元")  # 實際月租金（元）
        size_str = _get(row, "建物總面積平方公尺", "建物移轉總面積平方公尺")
        if not street or not rent_str:
            continue
        try:
            rent = float(rent_str.replace(",", ""))
        except ValueError:
            continue
        if rent <= 0:
            continue
        try:
            size_ping = float(size_str.replace(",", "")) * SQM_TO_PING if size_str else 0.0
        except ValueError:
            size_ping = 0.0
        buckets.setdefault(street, []).append((rent, size_ping))

    records = []
    for street, items in buckets.items():
        if not items:
            continue
        rents = [r for r, _ in items]
        sizes = [s for _, s in items if s > 0]
        records.append(RealPriceRecord(
            id=str(uuid.uuid4()),
            transaction_type="RENT",
            county=county,
            street=street,
            year=year,
            quarter=quarter,
            price_min=round(min(rents), 0),
            price_avg=round(sum(rents) / len(rents), 0),
            price_max=round(max(rents), 0),
            avg_size_ping=round(sum(sizes) / len(sizes), 1) if sizes else None,
            sample_count=len(rents),
        ))
    return records


def _upsert_records(db: Session, records: list[RealPriceRecord]) -> None:
    """批次 upsert（以 unique key 衝突則跳過）"""
    for rec in records:
        existing = (
            db.query(RealPriceRecord)
            .filter_by(
                county=rec.county,
                street=rec.street,
                transaction_type=rec.transaction_type,
                year=rec.year,
                quarter=rec.quarter,
            )
            .first()
        )
        if existing:
            existing.price_min = rec.price_min
            existing.price_avg = rec.price_avg
            existing.price_max = rec.price_max
            existing.avg_size_ping = rec.avg_size_ping
            existing.sample_count = rec.sample_count
        else:
            db.add(rec)
    db.commit()


def _set_status(db: Session, **kwargs) -> None:
    row = db.get(RealPriceSyncStatus, 1)
    if not row:
        row = RealPriceSyncStatus(id=1)
        db.add(row)
    for k, v in kwargs.items():
        setattr(row, k, v)
    db.commit()


async def run_sync(years_back: int = 10, county_names: list[str] | None = None) -> None:
    """
    背景任務：下載並解析過去 N 年的實價登錄資料。
    county_names: 指定縣市清單（例：["台北市", "新北市"]），None 代表全台。
    """
    # 建立要下載的縣市代碼對應表（過濾）
    target_codes: dict[str, str] = (
        {code: name for code, name in COUNTY_CODES.items() if name in county_names}
        if county_names
        else COUNTY_CODES
    )
    if not target_codes:
        target_codes = COUNTY_CODES

    db = SessionLocal()
    try:
        quarters = _build_quarters(years_back)
        total = len(quarters) * len(target_codes) * 2  # 買 + 租
        _set_status(
            db,
            status="running",
            total_quarters=total,
            done_quarters=0,
            message="開始下載...",
            started_at=datetime.now(timezone.utc),
            finished_at=None,
        )

        done = 0
        for roc_year, q in quarters:
            ce_year = _roc_to_ce(roc_year)
            season = f"{roc_year}S{q}"
            for code, county in target_codes.items():
                for file_type, label in [("A", "BUY"), ("C", "RENT")]:
                    # 檔名格式：{縣市碼小寫}_lvr_land_{型別小寫}.csv
                    filename = f"{code.lower()}_lvr_land_{file_type.lower()}.csv"
                    text = await _fetch_csv(season, filename)
                    done += 1

                    if text:
                        if file_type == "A":
                            records = await asyncio.to_thread(
                                _parse_buy_csv, text, county, ce_year, q
                            )
                        else:
                            records = await asyncio.to_thread(
                                _parse_rent_csv, text, county, ce_year, q
                            )
                        if records:
                            await asyncio.to_thread(_upsert_records, db, records)

                    _set_status(
                        db,
                        done_quarters=done,
                        message=f"{county} {ce_year}Q{q} {label} 完成",
                    )

        _set_status(
            db,
            status="done",
            done_quarters=done,
            message="同步完成",
            finished_at=datetime.now(timezone.utc),
        )
        logger.info("實價登錄同步完成")

    except Exception as e:
        logger.error(f"實價登錄同步失敗: {e}", exc_info=True)
        try:
            _set_status(db, status="error", message=str(e)[:490])
        except Exception:
            pass
    finally:
        db.close()
