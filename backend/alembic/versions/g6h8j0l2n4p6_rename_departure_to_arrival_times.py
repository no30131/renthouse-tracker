"""rename_departure_to_arrival_times

Revision ID: g6h8j0l2n4p6
Revises: b3d5f7h9j1l3
Create Date: 2026-04-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'g6h8j0l2n4p6'
down_revision: Union[str, Sequence[str], None] = 'b3d5f7h9j1l3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users RENAME COLUMN commute_departure_times TO commute_arrival_times")
    op.execute("ALTER TABLE commute_records RENAME COLUMN departure_time TO arrival_time")


def downgrade() -> None:
    op.execute("ALTER TABLE users RENAME COLUMN commute_arrival_times TO commute_departure_times")
    op.execute("ALTER TABLE commute_records RENAME COLUMN arrival_time TO departure_time")
