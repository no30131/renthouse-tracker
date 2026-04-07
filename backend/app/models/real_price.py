import uuid
from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RealPriceRecord(Base):
    """
    預聚合的實價登錄資料，以 (縣市, 路名, 類型, 西元年, 季度) 為一筆記錄。
    資料來源：內政部不動產交易實價查詢服務網開放資料 CSV。
    """
    __tablename__ = "real_price_records"
    __table_args__ = (
        UniqueConstraint(
            "county", "street", "transaction_type", "year", "quarter",
            name="uq_real_price_key"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    transaction_type: Mapped[str] = mapped_column(String(4), nullable=False)   # BUY / RENT
    county: Mapped[str] = mapped_column(String(20), nullable=False)             # 台北市
    street: Mapped[str] = mapped_column(String(100), nullable=False)            # 中山北路一段
    year: Mapped[int] = mapped_column(Integer, nullable=False)                  # 西元年
    quarter: Mapped[int] = mapped_column(Integer, nullable=False)               # 1~4

    # 買賣：每坪單價（元/坪）；租賃：每坪月租金（元/坪）
    price_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_max: Mapped[float | None] = mapped_column(Float, nullable=True)

    # 租賃專用：平均坪數
    avg_size_ping: Mapped[float | None] = mapped_column(Float, nullable=True)

    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class RealPriceSyncStatus(Base):
    """追蹤背景下載任務的進度。"""
    __tablename__ = "real_price_sync_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="idle")
    # idle / running / done / error
    total_quarters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    done_quarters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
