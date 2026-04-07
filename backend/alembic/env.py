from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.config import settings
from app.database import Base
import app.models  # noqa: F401 — ensure all models are registered

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# PostGIS / tiger / topology 內建 table，autogenerate 時忽略
_EXCLUDE_TABLES = {
    "spatial_ref_sys", "geometry_columns", "geography_columns",
    "raster_columns", "raster_overviews", "topology", "layer",
    "zcta5", "faces", "place", "county", "state_lookup", "pagc_gaz",
    "zip_lookup_base", "loader_variables", "place_lookup", "tabblock",
    "featnames", "loader_lookuptables", "pagc_rules", "zip_lookup",
    "cousub", "tract", "street_type_lookup", "state", "pagc_lex",
    "addrfeat", "countysub_lookup", "bg", "secondary_unit_lookup",
    "geocode_settings_default", "loader_platform", "zip_lookup_all",
    "zip_state_loc", "county_lookup", "geocode_settings",
    "direction_lookup", "addr", "tabblock20", "edges", "zip_state",
}


def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table" and name in _EXCLUDE_TABLES:
        return False
    return True


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
