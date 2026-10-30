import pytest

from tests.conftest import register, requires_db

pytestmark = requires_db


async def test_register_login_me_refresh(client):
    headers, data = await register(client, email="Alex@Test.dev", name="  Alex  ")
    assert data["user"]["name"] == "Alex"
    assert data["user"]["role"] == "CUSTOMER"

    r = await client.post("/auth/login", json={"email": "alex@test.dev", "password": "password123"})
    assert r.status_code == 200
    tokens = r.json()

    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200 and r.json()["email"].lower() == "alex@test.dev"

    r = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200 and r.json()["access_token"]


async def test_duplicate_email_is_case_insensitive(client):
    await register(client, email="dup@test.dev")
    r = await client.post(
        "/auth/register", json={"name": "X", "email": "DUP@test.dev", "password": "password123", "role": "PROVIDER"}
    )
    assert r.status_code == 409


async def test_bad_credentials_and_tokens(client):
    await register(client, email="a@test.dev")
    r = await client.post("/auth/login", json={"email": "a@test.dev", "password": "wrong-password"})
    assert r.status_code == 401
    r = await client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401
    r = await client.get("/auth/me")
    assert r.status_code == 401


async def test_refresh_token_cannot_be_used_as_access_token(client):
    _, data = await register(client)
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {data['refresh_token']}"})
    assert r.status_code == 401


async def test_short_password_rejected(client):
    r = await client.post("/auth/register", json={"name": "X", "email": "x@test.dev", "password": "short", "role": "CUSTOMER"})
    assert r.status_code == 422


async def test_password_reset_flow(client, monkeypatch):
    from app.services import notifications

    sent = {}

    async def capture(to, name, token):
        sent["token"] = token

    monkeypatch.setattr(notifications, "password_reset", capture)
    _, data = await register(client, email="reset@test.dev")

    r = await client.post("/auth/forgot-password", json={"email": "reset@test.dev"})
    assert r.status_code == 202 and "token" in sent
    # Unknown emails get the same response
    r = await client.post("/auth/forgot-password", json={"email": "nobody@test.dev"})
    assert r.status_code == 202

    r = await client.post("/auth/reset-password", json={"token": sent["token"], "new_password": "new-password-1"})
    assert r.status_code == 200
    # Token is single-use
    r = await client.post("/auth/reset-password", json={"token": sent["token"], "new_password": "another-pass-2"})
    assert r.status_code == 400
    # Old refresh tokens are revoked
    r = await client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert r.status_code == 401

    r = await client.post("/auth/login", json={"email": "reset@test.dev", "password": "new-password-1"})
    assert r.status_code == 200


async def test_role_guards(client):
    customer_headers, _ = await register(client, "CUSTOMER")
    provider_headers, _ = await register(client, "PROVIDER")

    profile = {"bio": "", "category": "Tutor", "location": "Toronto", "hourly_rate": 10}
    r = await client.put("/providers/me", headers=customer_headers, json=profile)
    assert r.status_code == 403

    # Provider without a profile must onboard first
    r = await client.get("/providers/me/services", headers=provider_headers)
    assert r.status_code == 409

    r = await client.put("/providers/me", headers=provider_headers, json={**profile, "category": "Astrologer"})
    assert r.status_code == 422

    r = await client.put("/providers/me", headers=provider_headers, json=profile)
    assert r.status_code == 200
    r = await client.get("/auth/me", headers=provider_headers)
    assert r.json()["has_provider_profile"] is True
