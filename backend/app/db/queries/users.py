from datetime import datetime
from typing import Optional
from uuid import UUID

import asyncpg

USER_COLUMNS = """
    u.id, u.name, u.email, u.password_hash, u.role::text AS role, u.token_version, u.created_at,
    EXISTS (SELECT 1 FROM provider_profiles p WHERE p.user_id = u.id) AS has_provider_profile
"""


async def get_by_id(conn: asyncpg.Connection, user_id: UUID) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(f"SELECT {USER_COLUMNS} FROM users u WHERE u.id = $1", user_id)


async def get_by_email(conn: asyncpg.Connection, email: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(f"SELECT {USER_COLUMNS} FROM users u WHERE lower(u.email) = lower($1)", email)


async def create(conn: asyncpg.Connection, name: str, email: str, password_hash: str, role: str) -> asyncpg.Record:
    row = await conn.fetchrow(
        """
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4::user_role)
        RETURNING id
        """,
        name,
        email,
        password_hash,
        role,
    )
    return await get_by_id(conn, row["id"])


async def update_password(conn: asyncpg.Connection, user_id: UUID, password_hash: str) -> None:
    # Bumping token_version invalidates every outstanding refresh token
    await conn.execute(
        "UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1",
        user_id,
        password_hash,
    )


async def create_reset_token(conn: asyncpg.Connection, user_id: UUID, token_hash: str, expires_at: datetime) -> None:
    # Only the newest reset link stays valid
    await conn.execute(
        "UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
        user_id,
    )
    await conn.execute(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        user_id,
        token_hash,
        expires_at,
    )


async def consume_reset_token(conn: asyncpg.Connection, token_hash: str) -> Optional[UUID]:
    """Atomically mark a valid token as used and return its user id."""
    return await conn.fetchval(
        """
        UPDATE password_reset_tokens
        SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id
        """,
        token_hash,
    )
