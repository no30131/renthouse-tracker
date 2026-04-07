"""add real_price_records and real_price_sync_status tables

Revision ID: f3a7e1b2c9d0
Revises: 188a30d8e27e
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3a7e1b2c9d0"
down_revision: Union[str, Sequence[str], None] = "188a30d8e27e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "real_price_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("transaction_type", sa.String(4), nullable=False),
        sa.Column("county", sa.String(20), nullable=False),
        sa.Column("street", sa.String(100), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("quarter", sa.Integer, nullable=False),
        sa.Column("price_min", sa.Float, nullable=True),
        sa.Column("price_avg", sa.Float, nullable=True),
        sa.Column("price_max", sa.Float, nullable=True),
        sa.Column("avg_size_ping", sa.Float, nullable=True),
        sa.Column("sample_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "county", "street", "transaction_type", "year", "quarter",
            name="uq_real_price_key",
        ),
    )
    op.create_index(
        "ix_real_price_county_street",
        "real_price_records",
        ["county", "street", "transaction_type"],
    )

    op.create_table(
        "real_price_sync_status",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="idle"),
        sa.Column("total_quarters", sa.Integer, nullable=False, server_default="0"),
        sa.Column("done_quarters", sa.Integer, nullable=False, server_default="0"),
        sa.Column("message", sa.String(500), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_index("ix_real_price_county_street", table_name="real_price_records")
    op.drop_table("real_price_records")
    op.drop_table("real_price_sync_status")
