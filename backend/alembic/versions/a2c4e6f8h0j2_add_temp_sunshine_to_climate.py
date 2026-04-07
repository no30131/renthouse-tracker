"""add_temp_sunshine_to_climate

Revision ID: a2c4e6f8h0j2
Revises: f5g7i9k1m3o5
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a2c4e6f8h0j2'
down_revision: Union[str, Sequence[str], None] = 'f5g7i9k1m3o5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('districts_climate', sa.Column('avg_temp_celsius', sa.Float(), nullable=True))
    op.add_column('districts_climate', sa.Column('sunshine_hours_per_year', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('districts_climate', 'sunshine_hours_per_year')
    op.drop_column('districts_climate', 'avg_temp_celsius')
