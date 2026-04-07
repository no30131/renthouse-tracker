import uuid
from geoalchemy2 import Geometry
from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    wishlist: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    dislikes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    company_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_coordinates: Mapped[object | None] = mapped_column(
        Geometry("POINT", srid=4326), nullable=True
    )
    commute_arrival_times: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    current_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_coordinates: Mapped[object | None] = mapped_column(
        Geometry("POINT", srid=4326), nullable=True
    )
    current_district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_commute_cache: Mapped[list | None] = mapped_column(JSONB, nullable=True)
