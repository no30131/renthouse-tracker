import uuid
from datetime import datetime
from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class IsochroneCache(Base):
    __tablename__ = "isochrone_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_address_key: Mapped[str] = mapped_column(String(500), nullable=False)
    travel_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    duration_mins: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    polygon: Mapped[object | None] = mapped_column(
        Geometry("POLYGON", srid=4326), nullable=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
