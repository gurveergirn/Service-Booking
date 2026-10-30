import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Mapping, Tuple

import bcrypt
import jwt

from app.core.config import get_settings

ACCESS = "access"
REFRESH = "refresh"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _encode(user: Mapping[str, Any], token_type: str, lifetime: timedelta, extra: Dict[str, Any]) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["id"]),
        "role": user["role"],
        "type": token_type,
        "iat": now,
        "exp": now + lifetime,
        **extra,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user: Mapping[str, Any]) -> str:
    settings = get_settings()
    return _encode(
        user,
        ACCESS,
        timedelta(minutes=settings.access_token_expire_minutes),
        {"name": user["name"], "email": user["email"]},
    )


def create_refresh_token(user: Mapping[str, Any]) -> str:
    settings = get_settings()
    return _encode(
        user,
        REFRESH,
        timedelta(days=settings.refresh_token_expire_days),
        # token_version lets us revoke every refresh token for a user (e.g. after a password reset)
        {"ver": user["token_version"], "jti": uuid.uuid4().hex},
    )


def decode_token(token: str, expected_type: str) -> Dict[str, Any]:
    """Decode and validate a JWT. Raises jwt.InvalidTokenError on any problem."""
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload


def generate_reset_token() -> Tuple[str, str]:
    """Returns (raw token to email, sha256 hash to store)."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_reset_token(raw)


def hash_reset_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
