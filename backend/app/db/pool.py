from typing import Optional, Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import asyncpg

from app.core.config import get_settings

_pool: Optional[asyncpg.Pool] = None


def parse_database_url(url: str) -> Tuple[str, Optional[str]]:
    """Split libpq-style params asyncpg doesn't understand out of the URL.

    Neon URLs look like postgresql://...?sslmode=require&channel_binding=require.
    Returns (clean dsn, ssl mode or None).
    """
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query))
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    scheme = parts.scheme.split("+")[0]
    if scheme == "postgres":
        scheme = "postgresql"
    dsn = urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    ssl = sslmode if sslmode and sslmode != "disable" else None
    return dsn, ssl


def uses_pgbouncer(dsn: str) -> bool:
    # Neon's pooled endpoints run PgBouncer in transaction mode, which breaks prepared-statement caching
    return "-pooler" in dsn


async def init_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        dsn, ssl = parse_database_url(get_settings().database_url)
        _pool = await asyncpg.create_pool(
            dsn,
            ssl=ssl,
            min_size=1,
            max_size=10,
            command_timeout=30,
            statement_cache_size=0 if uses_pgbouncer(dsn) else 100,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialised")
    return _pool
