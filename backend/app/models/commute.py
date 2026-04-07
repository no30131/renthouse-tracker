import uuid
from datetime import datetime, time
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CommuteRecord(Base):
    __tablename__ = "commute_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    house_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("houses.id", ondelete="CASCADE"), nullable=False
    )
    company_label: Mapped[str] = mapped_column(String(100), nullable=False)
    travel_mode: Mapped[str] = mapped_column(String(20), nullable=False)  # DRIVE, TWO_WHEELER
    arrival_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    estimated_time_mins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    house: Mapped["House"] = relationship(back_populates="commute_records")


from app.models.house import House  # noqa: E402
