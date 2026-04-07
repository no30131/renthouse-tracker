"""init

Revision ID: e5b138149cdb
Revises:
Create Date: 2026-04-03 13:50:22.146198

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e5b138149cdb'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        'districts_climate',
        sa.Column('district_name', sa.String(length=100), nullable=False),
        sa.Column('avg_humidity', sa.Float(), nullable=True),
        sa.Column('rainy_days_per_year', sa.Integer(), nullable=True),
        sa.Column('last_updated', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('district_name'),
    )
    op.create_table(
        'houses',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('source_id', sa.String(length=200), nullable=True),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=True),
        sa.Column('coordinates', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326), nullable=True),
        sa.Column('rent_price', sa.Integer(), nullable=True),
        sa.Column('floor', sa.String(length=50), nullable=True),
        sa.Column('management_fee', sa.Integer(), nullable=True),
        sa.Column('pet_friendly', sa.Boolean(), nullable=True),
        sa.Column('cooking_allowed', sa.Boolean(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('user_rating', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('raw_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source', 'source_id', name='uq_source_source_id'),
    )
    op.create_table(
        'isochrone_cache',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_address_key', sa.String(length=500), nullable=False),
        sa.Column('travel_mode', sa.String(length=20), nullable=False),
        sa.Column('duration_mins', sa.Integer(), nullable=False),
        sa.Column('polygon', geoalchemy2.types.Geometry(geometry_type='POLYGON', srid=4326), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('wishlist', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('dislikes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('company_label', sa.String(length=100), nullable=True),
        sa.Column('company_address', sa.Text(), nullable=True),
        sa.Column('company_coordinates', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
    )
    op.create_table(
        'commute_records',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('house_id', sa.UUID(), nullable=False),
        sa.Column('company_label', sa.String(length=100), nullable=False),
        sa.Column('travel_mode', sa.String(length=20), nullable=False),
        sa.Column('departure_time', sa.Time(), nullable=True),
        sa.Column('estimated_time_mins', sa.Integer(), nullable=True),
        sa.Column('distance_km', sa.Float(), nullable=True),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['house_id'], ['houses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('commute_records')
    op.drop_table('users')
    op.drop_table('isochrone_cache')
    op.drop_table('houses')
    op.drop_table('districts_climate')
