from typing import List, Optional
from uuid import UUID

import asyncpg

SERVICE_COLUMNS = "id, provider_id, name, description, duration_minutes, price, is_active"


async def list_for_provider(conn: asyncpg.Connection, provider_id: UUID, active_only: bool = True) -> List[asyncpg.Record]:
    return await conn.fetch(
        f"""
        SELECT {SERVICE_COLUMNS} FROM services
        WHERE provider_id = $1 AND (is_active OR NOT $2)
        ORDER BY price, name
        """,
        provider_id,
        active_only,
    )


async def get(conn: asyncpg.Connection, service_id: UUID) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(f"SELECT {SERVICE_COLUMNS} FROM services WHERE id = $1", service_id)


async def create(
    conn: asyncpg.Connection, provider_id: UUID, name: str, description: str, duration_minutes: int, price: float
) -> asyncpg.Record:
    return await conn.fetchrow(
        f"""
        INSERT INTO services (provider_id, name, description, duration_minutes, price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING {SERVICE_COLUMNS}
        """,
        provider_id,
        name,
        description,
        duration_minutes,
        price,
    )


async def update(
    conn: asyncpg.Connection,
    provider_id: UUID,
    service_id: UUID,
    name: str,
    description: str,
    duration_minutes: int,
    price: float,
) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        f"""
        UPDATE services
        SET name = $3, description = $4, duration_minutes = $5, price = $6
        WHERE id = $2 AND provider_id = $1 AND is_active
        RETURNING {SERVICE_COLUMNS}
        """,
        provider_id,
        service_id,
        name,
        description,
        duration_minutes,
        price,
    )


async def deactivate(conn: asyncpg.Connection, provider_id: UUID, service_id: UUID) -> bool:
    # Soft delete: past bookings keep pointing at the service
    result = await conn.execute(
        "UPDATE services SET is_active = false WHERE id = $2 AND provider_id = $1 AND is_active",
        provider_id,
        service_id,
    )
    return result != "UPDATE 0"
