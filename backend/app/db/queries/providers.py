from typing import Any, List, Optional, Tuple
from uuid import UUID

import asyncpg

PROVIDER_SELECT = """
    SELECT p.id, p.user_id, u.name, u.email, p.bio, p.category, p.location, p.hourly_rate,
           p.avatar_url, p.created_at,
           COALESCE(r.avg_rating, 0)::float AS avg_rating,
           COALESCE(r.review_count, 0)::int AS review_count,
           COALESCE(s.min_price, p.hourly_rate) AS starting_price
    FROM provider_profiles p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN LATERAL (
        SELECT avg(rating) AS avg_rating, count(*) AS review_count
        FROM reviews WHERE provider_id = p.id
    ) r ON true
    LEFT JOIN LATERAL (
        SELECT min(price) AS min_price
        FROM services WHERE provider_id = p.id AND is_active
    ) s ON true
"""

# Whitelisted ORDER BY clauses; user input only ever selects a key
SORTS = {
    "rating": "avg_rating DESC, review_count DESC, name",
    "price_asc": "starting_price ASC, name",
    "price_desc": "starting_price DESC, name",
    "newest": "created_at DESC",
}


async def get_by_id(conn: asyncpg.Connection, provider_id: UUID) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(PROVIDER_SELECT + " WHERE p.id = $1", provider_id)


async def get_by_user(conn: asyncpg.Connection, user_id: UUID) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(PROVIDER_SELECT + " WHERE p.user_id = $1", user_id)


async def search(
    conn: asyncpg.Connection,
    *,
    q: Optional[str],
    category: Optional[str],
    location: Optional[str],
    min_rating: Optional[float],
    min_price: Optional[float],
    max_price: Optional[float],
    sort: str,
    limit: int,
    offset: int,
) -> Tuple[List[asyncpg.Record], int]:
    clauses: List[str] = []
    params: List[Any] = []

    def add(clause: str, value: Any) -> None:
        params.append(value)
        clauses.append(clause.format(n=len(params)))

    if q:
        add("(u.name ILIKE '%' || ${n} || '%' OR p.bio ILIKE '%' || ${n} || '%' OR p.category ILIKE '%' || ${n} || '%')", q)
    if category:
        add("lower(p.category) = lower(${n})", category)
    if location:
        add("p.location ILIKE '%' || ${n} || '%'", location)
    if min_rating is not None:
        add("COALESCE(r.avg_rating, 0) >= ${n}", min_rating)
    if min_price is not None:
        add("COALESCE(s.min_price, p.hourly_rate) >= ${n}", min_price)
    if max_price is not None:
        add("COALESCE(s.min_price, p.hourly_rate) <= ${n}", max_price)

    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    order = SORTS.get(sort, SORTS["rating"])
    base = f"SELECT * FROM ({PROVIDER_SELECT}{where}) results"

    total = await conn.fetchval(f"SELECT count(*) FROM ({base}) counted", *params)
    n = len(params)
    rows = await conn.fetch(f"{base} ORDER BY {order} LIMIT ${n + 1} OFFSET ${n + 2}", *params, limit, offset)
    return rows, total


async def upsert_profile(
    conn: asyncpg.Connection,
    user_id: UUID,
    bio: str,
    category: str,
    location: str,
    hourly_rate: float,
    avatar_url: Optional[str],
) -> UUID:
    return await conn.fetchval(
        """
        INSERT INTO provider_profiles (user_id, bio, category, location, hourly_rate, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE
        SET bio = EXCLUDED.bio, category = EXCLUDED.category, location = EXCLUDED.location,
            hourly_rate = EXCLUDED.hourly_rate, avatar_url = EXCLUDED.avatar_url
        RETURNING id
        """,
        user_id,
        bio,
        category,
        location,
        hourly_rate,
        avatar_url,
    )


async def lock_provider(conn: asyncpg.Connection, provider_id: UUID) -> Optional[UUID]:
    """Row-lock the provider so concurrent bookings for them are serialised."""
    return await conn.fetchval("SELECT id FROM provider_profiles WHERE id = $1 FOR UPDATE", provider_id)
