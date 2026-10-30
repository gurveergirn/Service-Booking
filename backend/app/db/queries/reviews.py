from typing import List, Tuple
from uuid import UUID

import asyncpg

REVIEW_SELECT = """
    SELECT r.id, r.booking_id, r.provider_id, r.rating, r.comment, r.created_at,
           u.name AS customer_name, s.name AS service_name
    FROM reviews r
    JOIN users u ON u.id = r.customer_id
    JOIN bookings b ON b.id = r.booking_id
    JOIN services s ON s.id = b.service_id
"""


async def list_for_provider(conn: asyncpg.Connection, provider_id: UUID, limit: int, offset: int) -> Tuple[List[asyncpg.Record], int]:
    total = await conn.fetchval("SELECT count(*) FROM reviews WHERE provider_id = $1", provider_id)
    rows = await conn.fetch(
        REVIEW_SELECT + " WHERE r.provider_id = $1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3",
        provider_id,
        limit,
        offset,
    )
    return rows, total


async def create(conn: asyncpg.Connection, booking_id: UUID, customer_id: UUID, provider_id: UUID, rating: int, comment: str) -> asyncpg.Record:
    review_id = await conn.fetchval(
        """
        INSERT INTO reviews (booking_id, customer_id, provider_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """,
        booking_id,
        customer_id,
        provider_id,
        rating,
        comment,
    )
    return await conn.fetchrow(REVIEW_SELECT + " WHERE r.id = $1", review_id)
