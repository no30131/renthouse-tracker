"""add size_ping to houses

Revision ID: a1b2c3d4e5f6
Revises: e5b138149cdb
Create Date: 2026-04-03 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e5b138149cdb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('houses', sa.Column('size_ping', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('houses', 'size_ping')
