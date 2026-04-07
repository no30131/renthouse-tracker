"""add_current_residence_to_users

Revision ID: c2d4f6a8b0e1
Revises: 188a30d8e27e
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c2d4f6a8b0e1'
down_revision: Union[str, Sequence[str], None] = 'f3a7e1b2c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('current_address', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('current_coordinates', Geometry('POINT', srid=4326), nullable=True))
    op.add_column('users', sa.Column('current_district', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('current_commute_cache', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'current_commute_cache')
    op.drop_column('users', 'current_district')
    op.drop_column('users', 'current_coordinates')
    op.drop_column('users', 'current_address')
