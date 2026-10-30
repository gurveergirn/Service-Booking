from datetime import datetime, timedelta, timezone
from uuid import UUID

import asyncpg
import jwt
from fastapi import BackgroundTasks, HTTPException, status

from app.core.config import get_settings
from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.db.queries import users as users_q
from app.models.auth import RegisterRequest, TokenResponse, UserOut
from app.services import notifications


def user_out(user: asyncpg.Record) -> UserOut:
    return UserOut.model_validate(dict(user))


def issue_tokens(user: asyncpg.Record) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user),
        refresh_token=create_refresh_token(user),
        user=user_out(user),
    )


async def register(conn: asyncpg.Connection, payload: RegisterRequest) -> TokenResponse:
    try:
        user = await users_q.create(conn, payload.name, payload.email, hash_password(payload.password), payload.role)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    return issue_tokens(user)


async def login(conn: asyncpg.Connection, email: str, password: str) -> TokenResponse:
    user = await users_q.get_by_email(conn, email)
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return issue_tokens(user)


async def refresh(conn: asyncpg.Connection, refresh_token: str) -> TokenResponse:
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please log in again")
    try:
        payload = decode_token(refresh_token, REFRESH)
        user = await users_q.get_by_id(conn, UUID(payload["sub"]))
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise invalid
    if not user or user["token_version"] != payload.get("ver"):
        raise invalid
    return issue_tokens(user)


async def forgot_password(conn: asyncpg.Connection, email: str, background: BackgroundTasks) -> None:
    # Same response whether or not the account exists, so emails can't be enumerated
    user = await users_q.get_by_email(conn, email)
    if not user:
        return
    raw, token_hash = generate_reset_token()
    expires = datetime.now(timezone.utc) + timedelta(minutes=get_settings().password_reset_expire_minutes)
    await users_q.create_reset_token(conn, user["id"], token_hash, expires)
    background.add_task(notifications.password_reset, user["email"], user["name"], raw)


async def reset_password(conn: asyncpg.Connection, token: str, new_password: str) -> None:
    async with conn.transaction():
        user_id = await users_q.consume_reset_token(conn, hash_reset_token(token))
        if not user_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired")
        await users_q.update_password(conn, user_id, hash_password(new_password))
