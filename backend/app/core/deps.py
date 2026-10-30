from typing import AsyncIterator
from uuid import UUID

import asyncpg
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.security import ACCESS, decode_token
from app.db.pool import get_pool
from app.db.queries import providers as providers_q
from app.db.queries import users as users_q
from app.models.common import Role

bearer = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    id: UUID
    name: str
    email: str
    role: Role


async def get_db() -> AsyncIterator[asyncpg.Connection]:
    async with get_pool().acquire() as conn:
        yield conn


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    conn: asyncpg.Connection = Depends(get_db),
) -> CurrentUser:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"}
    )
    if creds is None:
        raise unauthorized
    try:
        payload = decode_token(creds.credentials, ACCESS)
        user = await users_q.get_by_id(conn, UUID(payload["sub"]))
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise unauthorized
    if user is None:
        raise unauthorized
    return CurrentUser(id=user["id"], name=user["name"], email=user["email"], role=user["role"])


def require_role(role: str):
    async def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role != role:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"This action requires a {role.lower()} account")
        return user

    return dependency


require_customer = require_role("CUSTOMER")
require_provider = require_role("PROVIDER")


async def get_provider_profile(
    user: CurrentUser = Depends(require_provider),
    conn: asyncpg.Connection = Depends(get_db),
) -> asyncpg.Record:
    profile = await providers_q.get_by_user(conn, user.id)
    if profile is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Finish setting up your provider profile first")
    return profile
