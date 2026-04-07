"""add_neighborhood_to_houses

Revision ID: d3e5g7i9k1m3
Revises: c2d4f6a8b0e1
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd3e5g7i9k1m3'
down_revision: Union[str, Sequence[str], None] = 'c2d4f6a8b0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('houses', sa.Column('neighborhood', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('current_neighborhood', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('houses', 'neighborhood')
    op.drop_column('users', 'current_neighborhood')
