"""API tests run against a real Postgres database named by TEST_DATABASE_URL.

The database is migrated once per session and truncated before each test.
Tests that need the database are skipped when TEST_DATABASE_URL is unset.
"""
import os
import secrets

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if TEST_DATABASE_URL:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("DATABASE_URL", "postgresql://unused@localhost/unused")
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(32))
os.environ["ENABLE_SCHEDULER"] = "false"
os.environ["RESEND_API_KEY"] = ""

import pytest  # noqa: E402

requires_db = pytest.mark.skipif(not TEST_DATABASE_URL, reason="TEST_DATABASE_URL not set")


@pytest.fixture(scope="session")
def migrated():
    from alembic import command
    from alembic.config import Config

    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "migrations"))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


@pytest.fixture
async def client(migrated):
    import httpx

    from app.db import pool as pool_module
    from app.main import app

    pool = await pool_module.init_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "TRUNCATE users, provider_profiles, services, availability_slots, blocked_dates, "
            "bookings, reviews, password_reset_tokens CASCADE"
        )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1") as c:
        yield c
    await pool_module.close_pool()


async def register(client, role="CUSTOMER", email=None, name="Test User", password="password123"):
    email = email or f"{secrets.token_hex(4)}@test.dev"
    r = await client.post("/auth/register", json={"name": name, "email": email, "password": password, "role": role})
    assert r.status_code == 201, r.text
    data = r.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data


@pytest.fixture
async def provider(client):
    """A provider with a profile, one 60-minute service and 09:00-17:00 availability every day."""
    headers, data = await register(client, "PROVIDER", name="Pat Provider")
    r = await client.put(
        "/providers/me",
        headers=headers,
        json={"bio": "Hi", "category": "Barber", "location": "Austin, TX", "hourly_rate": 50},
    )
    assert r.status_code == 200, r.text
    profile = r.json()
    r = await client.post(
        "/providers/me/services",
        headers=headers,
        json={"name": "Haircut", "description": "", "duration_minutes": 60, "price": 40},
    )
    assert r.status_code == 201, r.text
    service = r.json()
    windows = [{"day_of_week": d, "start_time": "09:00", "end_time": "17:00"} for d in range(7)]
    r = await client.put("/providers/me/availability", headers=headers, json={"windows": windows})
    assert r.status_code == 200, r.text
    return {"headers": headers, "user": data["user"], "profile": profile, "service": service}
