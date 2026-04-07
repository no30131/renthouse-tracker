"""drop_districts_climate

Revision ID: b3d5f7h9j1l3
Revises: a2c4e6f8h0j2
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b3d5f7h9j1l3'
down_revision: Union[str, Sequence[str], None] = 'a2c4e6f8h0j2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('districts_climate')


def downgrade() -> None:
    op.create_table(
        'districts_climate',
        sa.Column('district_name', sa.String(100), primary_key=True),
        sa.Column('avg_humidity', sa.Float(), nullable=True),
        sa.Column('rainy_days_per_year', sa.Integer(), nullable=True),
        sa.Column('avg_temp_celsius', sa.Float(), nullable=True),
        sa.Column('sunshine_hours_per_year', sa.Float(), nullable=True),
        sa.Column('last_updated', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
