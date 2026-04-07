"""drop_neighborhood_columns

Revision ID: f5g7i9k1m3o5
Revises: e4f6h8j0l2n4
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f5g7i9k1m3o5'
down_revision: Union[str, Sequence[str], None] = 'e4f6h8j0l2n4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('houses', 'neighborhood')
    op.drop_column('users', 'current_neighborhood')


def downgrade() -> None:
    op.add_column('houses', sa.Column('neighborhood', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('current_neighborhood', sa.String(100), nullable=True))
