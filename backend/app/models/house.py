import uuid
from datetime import datetime
from geoalchemy2 import Geometry
import sqlalchemy as sa
from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class House(Base):
    __tablename__ = "houses"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_source_source_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # Manual, Crawler, FB_Group
    source_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    coordinates: Mapped[object | None] = mapped_column(
        Geometry("POINT", srid=4326), nullable=True
    )
    rent_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_ping: Mapped[float | None] = mapped_column(sa.Float, nullable=True)
    floor: Mapped[str | None] = mapped_column(String(50), nullable=True)
    management_fee: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pet_friendly: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    cooking_allowed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    user_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    commute_records: Mapped[list["CommuteRecord"]] = relationship(
        back_populates="house", cascade="all, delete-orphan"
    )


from app.models.commute import CommuteRecord  # noqa: E402
