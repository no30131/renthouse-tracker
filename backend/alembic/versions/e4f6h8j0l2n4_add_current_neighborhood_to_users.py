"""add_current_neighborhood_to_users

Revision ID: e4f6h8j0l2n4
Revises: d3e5g7i9k1m3
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e4f6h8j0l2n4'
down_revision: Union[str, Sequence[str], None] = 'd3e5g7i9k1m3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('current_neighborhood', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'current_neighborhood')
