"""add_parking_to_houses

Revision ID: h8j0l2n4p6r8
Revises: g6h8j0l2n4p6
Create Date: 2026-07-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'h8j0l2n4p6r8'
down_revision: Union[str, Sequence[str], None] = 'g6h8j0l2n4p6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('houses', sa.Column('parking', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('houses', 'parking')
