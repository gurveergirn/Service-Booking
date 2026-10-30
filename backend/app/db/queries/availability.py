from datetime import date, time
from typing import Iterable, List, Optional, Tuple
from uuid import UUID

import asyncpg


async def list_windows(conn: asyncpg.Connection, provider_id: UUID, day_of_week: Optional[int] = None) -> List[asyncpg.Record]:
    return await conn.fetch(
        """
        SELECT id, day_of_week, start_time, end_time FROM availability_slots
        WHERE provider_id = $1 AND ($2::smallint IS NULL OR day_of_week = $2)
        ORDER BY day_of_week, start_time
        """,
        provider_id,
        day_of_week,
    )


async def replace_windows(conn: asyncpg.Connection, provider_id: UUID, windows: Iterable[Tuple[int, time, time]]) -> None:
    async with conn.transaction():
        await conn.execute("DELETE FROM availability_slots WHERE provider_id = $1", provider_id)
        await conn.executemany(
            "INSERT INTO availability_slots (provider_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)",
            [(provider_id, d, s, e) for d, s, e in windows],
        )


async def list_blocked(conn: asyncpg.Connection, provider_id: UUID, from_date: Optional[date] = None) -> List[asyncpg.Record]:
    return await conn.fetch(
        """
        SELECT id, date, reason FROM blocked_dates
        WHERE provider_id = $1 AND ($2::date IS NULL OR date >= $2)
        ORDER BY date
        """,
        provider_id,
        from_date,
    )


async def is_blocked(conn: asyncpg.Connection, provider_id: UUID, d: date) -> bool:
    return await conn.fetchval(
        "SELECT EXISTS (SELECT 1 FROM blocked_dates WHERE provider_id = $1 AND date = $2)", provider_id, d
    )


async def add_blocked(conn: asyncpg.Connection, provider_id: UUID, d: date, reason: Optional[str]) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        INSERT INTO blocked_dates (provider_id, date, reason) VALUES ($1, $2, $3)
        ON CONFLICT (provider_id, date) DO UPDATE SET reason = EXCLUDED.reason
        RETURNING id, date, reason
        """,
        provider_id,
        d,
        reason,
    )


async def remove_blocked(conn: asyncpg.Connection, provider_id: UUID, blocked_id: UUID) -> bool:
    result = await conn.execute("DELETE FROM blocked_dates WHERE id = $2 AND provider_id = $1", provider_id, blocked_id)
    return result != "DELETE 0"
