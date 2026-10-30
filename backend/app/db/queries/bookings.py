from datetime import date, datetime, time
from typing import List, Optional, Sequence
from uuid import UUID

import asyncpg

ACTIVE_STATUSES = ["PENDING", "CONFIRMED"]

BOOKING_SELECT = """
    SELECT b.id, b.customer_id, b.provider_id, b.service_id, b.date, b.start_time, b.end_time,
           b.status::text AS status, b.price, b.cancelled_by::text AS cancelled_by, b.created_at,
           s.name AS service_name, s.duration_minutes,
           cu.name AS customer_name, cu.email AS customer_email,
           pu.name AS provider_name, pu.email AS provider_email,
           p.category AS provider_category, p.avatar_url AS provider_avatar_url,
           EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id) AS has_review
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN users cu ON cu.id = b.customer_id
    JOIN provider_profiles p ON p.id = b.provider_id
    JOIN users pu ON pu.id = p.user_id
"""


async def get(conn: asyncpg.Connection, booking_id: UUID) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(BOOKING_SELECT + " WHERE b.id = $1", booking_id)


async def list_for_customer(conn: asyncpg.Connection, customer_id: UUID) -> List[asyncpg.Record]:
    return await conn.fetch(
        BOOKING_SELECT + " WHERE b.customer_id = $1 ORDER BY b.date DESC, b.start_time DESC", customer_id
    )


async def list_for_provider(
    conn: asyncpg.Connection,
    provider_id: UUID,
    *,
    statuses: Optional[Sequence[str]] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    ascending: bool = True,
) -> List[asyncpg.Record]:
    order = "ASC" if ascending else "DESC"
    return await conn.fetch(
        BOOKING_SELECT
        + f"""
        WHERE b.provider_id = $1
          AND ($2::text[] IS NULL OR b.status::text = ANY($2::text[]))
          AND ($3::date IS NULL OR b.date >= $3)
          AND ($4::date IS NULL OR b.date <= $4)
        ORDER BY b.date {order}, b.start_time {order}
        """,
        provider_id,
        list(statuses) if statuses else None,
        from_date,
        to_date,
    )


async def active_on_date(conn: asyncpg.Connection, provider_id: UUID, d: date, lock: bool = False) -> List[asyncpg.Record]:
    sql = """
        SELECT id, start_time, end_time FROM bookings
        WHERE provider_id = $1 AND date = $2 AND status::text = ANY($3::text[])
        ORDER BY start_time
    """
    if lock:
        sql += " FOR UPDATE"
    return await conn.fetch(sql, provider_id, d, ACTIVE_STATUSES)


async def insert(
    conn: asyncpg.Connection,
    customer_id: UUID,
    provider_id: UUID,
    service_id: UUID,
    d: date,
    start: time,
    end: time,
    price: float,
) -> UUID:
    return await conn.fetchval(
        """
        INSERT INTO bookings (customer_id, provider_id, service_id, date, start_time, end_time, price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        """,
        customer_id,
        provider_id,
        service_id,
        d,
        start,
        end,
        price,
    )


async def transition(
    conn: asyncpg.Connection,
    booking_id: UUID,
    from_statuses: Sequence[str],
    to_status: str,
    cancelled_by: Optional[str] = None,
) -> bool:
    """Compare-and-set status change; returns False if the booking was not in an allowed state."""
    result = await conn.execute(
        """
        UPDATE bookings
        SET status = $3::booking_status, cancelled_by = $4::user_role, updated_at = now()
        WHERE id = $1 AND status::text = ANY($2::text[])
        """,
        booking_id,
        list(from_statuses),
        to_status,
        cancelled_by,
    )
    return result != "UPDATE 0"


async def earnings(conn: asyncpg.Connection, provider_id: UUID, month_start: date) -> asyncpg.Record:
    return await conn.fetchrow(
        """
        SELECT COALESCE(sum(price), 0)::float AS total,
               COALESCE(sum(price) FILTER (WHERE date >= $2), 0)::float AS this_month,
               count(*)::int AS completed_count
        FROM bookings WHERE provider_id = $1 AND status = 'COMPLETED'
        """,
        provider_id,
        month_start,
    )


async def complete_past(conn: asyncpg.Connection, now: datetime) -> int:
    result = await conn.execute(
        """
        UPDATE bookings SET status = 'COMPLETED', updated_at = now()
        WHERE status = 'CONFIRMED' AND (date + end_time) <= $1
        """,
        now,
    )
    return int(result.split()[-1])


async def expire_stale_pending(conn: asyncpg.Connection, now: datetime) -> int:
    """Pending requests the provider never answered are cancelled once their start time passes."""
    result = await conn.execute(
        """
        UPDATE bookings SET status = 'CANCELLED', updated_at = now()
        WHERE status = 'PENDING' AND (date + start_time) <= $1
        """,
        now,
    )
    return int(result.split()[-1])


async def claim_due_reminders(conn: asyncpg.Connection, now: datetime, until: datetime) -> List[UUID]:
    rows = await conn.fetch(
        """
        UPDATE bookings SET reminder_sent_at = now()
        WHERE status = 'CONFIRMED' AND reminder_sent_at IS NULL
          AND (date + start_time) > $1 AND (date + start_time) <= $2
        RETURNING id
        """,
        now,
        until,
    )
    return [r["id"] for r in rows]
