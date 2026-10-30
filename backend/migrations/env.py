"""Alembic environment.

Migrations are plain SQL executed with op.execute(); there are no ORM models.
SQLAlchemy is only used here because Alembic needs it to hold a connection.
"""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings
from app.db.pool import parse_database_url, uses_pgbouncer

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def _url_and_connect_args():
    dsn, ssl = parse_database_url(get_settings().database_url)
    url = dsn.replace("postgresql://", "postgresql+asyncpg://", 1)
    connect_args = {}
    if ssl:
        connect_args["ssl"] = ssl
    if uses_pgbouncer(dsn):
        connect_args["statement_cache_size"] = 0
    return url, connect_args


def run_migrations_offline() -> None:
    url, _ = _url_and_connect_args()
    context.configure(url=url, target_metadata=None, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=None)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    url, connect_args = _url_and_connect_args()
    engine = create_async_engine(url, poolclass=pool.NullPool, connect_args=connect_args)
    async with engine.connect() as connection:
        await connection.run_sync(_do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
