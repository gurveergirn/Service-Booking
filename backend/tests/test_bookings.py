import asyncio
from datetime import date, timedelta

import pytest

from app.core.timeutil import today_local
from tests.conftest import register, requires_db

pytestmark = requires_db


def tomorrow() -> str:
    return (today_local() + timedelta(days=1)).isoformat()


async def slots_for(client, provider, day):
    r = await client.get(
        f"/providers/{provider['profile']['id']}/slots",
        params={"service_id": provider["service"]["id"], "date": day},
    )
    assert r.status_code == 200, r.text
    return [s["start_time"][:5] for s in r.json()["slots"]]


async def book(client, headers, provider, day, start):
    return await client.post(
        "/bookings", headers=headers, json={"service_id": provider["service"]["id"], "date": day, "start_time": start}
    )


async def test_public_profile_and_search(client, provider):
    r = await client.get(f"/providers/{provider['profile']['id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Pat Provider" and len(body["services"]) == 1 and len(body["availability"]) == 7

    r = await client.get("/providers", params={"category": "barber", "location": "austin"})
    assert r.json()["total"] == 1
    r = await client.get("/providers", params={"max_price": 30})
    assert r.json()["total"] == 0
    r = await client.get("/providers", params={"min_rating": 4})
    assert r.json()["total"] == 0
    r = await client.get("/providers", params={"q": "pat", "page": 2})
    assert r.json()["total"] == 1 and r.json()["items"] == []


async def test_booking_removes_slot_and_blocks_overlap(client, provider):
    headers, _ = await register(client)
    day = tomorrow()
    assert "10:00" in await slots_for(client, provider, day)

    r = await book(client, headers, provider, day, "10:00")
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "PENDING" and r.json()["end_time"].startswith("11:00")

    remaining = await slots_for(client, provider, day)
    assert "10:00" not in remaining and "09:30" not in remaining and "10:30" not in remaining
    assert "09:00" in remaining and "11:00" in remaining

    other, _ = await register(client)
    r = await book(client, other, provider, day, "10:30")
    assert r.status_code == 409


async def test_concurrent_bookings_only_one_wins(client, provider):
    customers = [(await register(client))[0] for _ in range(6)]
    day = tomorrow()
    results = await asyncio.gather(*(book(client, h, provider, day, "13:00") for h in customers))
    codes = sorted(r.status_code for r in results)
    assert codes == [201, 409, 409, 409, 409, 409]


async def test_booking_validation(client, provider):
    headers, _ = await register(client)
    # outside working hours
    r = await book(client, headers, provider, tomorrow(), "16:30")
    assert r.status_code == 409
    # in the past
    r = await book(client, headers, provider, (today_local() - timedelta(days=1)).isoformat(), "10:00")
    assert r.status_code == 400
    # providers can't book
    r = await book(client, provider["headers"], provider, tomorrow(), "10:00")
    assert r.status_code == 403


async def test_blocked_date_has_no_slots(client, provider):
    day = tomorrow()
    r = await client.post("/providers/me/blocked-dates", headers=provider["headers"], json={"date": day, "reason": "Vacation"})
    assert r.status_code == 201
    r = await client.get(
        f"/providers/{provider['profile']['id']}/slots", params={"service_id": provider["service"]["id"], "date": day}
    )
    assert r.json()["blocked"] is True and r.json()["slots"] == []
    headers, _ = await register(client)
    assert (await book(client, headers, provider, day, "10:00")).status_code == 409


async def test_accept_decline_cancel(client, provider):
    customer, _ = await register(client)
    day = tomorrow()
    first = (await book(client, customer, provider, day, "09:00")).json()
    second = (await book(client, customer, provider, day, "11:00")).json()

    # another provider can't touch these bookings
    other_provider, _ = await register(client, "PROVIDER")
    await client.put("/providers/me", headers=other_provider, json={"category": "Tutor", "location": "Xville", "hourly_rate": 1})
    assert (await client.post(f"/bookings/{first['id']}/accept", headers=other_provider)).status_code == 404

    r = await client.post(f"/bookings/{first['id']}/accept", headers=provider["headers"])
    assert r.status_code == 200 and r.json()["status"] == "CONFIRMED"
    assert (await client.post(f"/bookings/{first['id']}/accept", headers=provider["headers"])).status_code == 409

    r = await client.post(f"/bookings/{second['id']}/decline", headers=provider["headers"])
    assert r.json()["status"] == "CANCELLED" and r.json()["cancelled_by"] == "PROVIDER"
    # the declined slot is free again
    assert "11:00" in await slots_for(client, provider, day)

    r = await client.post(f"/bookings/{first['id']}/cancel", headers=customer)
    assert r.json()["status"] == "CANCELLED" and r.json()["cancelled_by"] == "CUSTOMER"
    stranger, _ = await register(client)
    assert (await client.post(f"/bookings/{first['id']}/cancel", headers=stranger)).status_code == 404

    r = await client.get("/bookings/me", headers=customer)
    assert len(r.json()) == 2


async def test_complete_review_and_dashboard(client, provider):
    from app.db.pool import get_pool

    customer, _ = await register(client, name="Rae")
    booking = (await book(client, customer, provider, tomorrow(), "09:00")).json()
    await client.post(f"/bookings/{booking['id']}/accept", headers=provider["headers"])

    # can't review or complete before the appointment
    r = await client.post(f"/bookings/{booking['id']}/review", headers=customer, json={"rating": 5})
    assert r.status_code == 400
    assert (await client.post(f"/bookings/{booking['id']}/complete", headers=provider["headers"])).status_code == 400

    # move the appointment into the past
    async with get_pool().acquire() as conn:
        await conn.execute("UPDATE bookings SET date = date - 3 WHERE id = $1", booking["id"])
    r = await client.post(f"/bookings/{booking['id']}/complete", headers=provider["headers"])
    assert r.status_code == 200 and r.json()["status"] == "COMPLETED"

    r = await client.post(f"/bookings/{booking['id']}/review", headers=customer, json={"rating": 4, "comment": " Great "})
    assert r.status_code == 201 and r.json()["comment"] == "Great"
    r = await client.post(f"/bookings/{booking['id']}/review", headers=customer, json={"rating": 5})
    assert r.status_code == 409

    r = await client.get(f"/providers/{provider['profile']['id']}/reviews")
    assert r.json()["total"] == 1 and r.json()["items"][0]["customer_name"] == "Rae"

    r = await client.get("/providers/me/dashboard", headers=provider["headers"])
    dash = r.json()
    assert dash["earnings"]["total"] == 40 and dash["earnings"]["completed_count"] == 1
    assert dash["rating"] == {"average": 4.0, "count": 1}


async def test_jobs_complete_past_and_send_reminders(client, provider, monkeypatch):
    from app.db.pool import get_pool
    from app.jobs.scheduler import run_jobs
    from app.services import notifications

    reminded = []

    async def capture(b):
        reminded.append(b["id"])

    monkeypatch.setattr(notifications, "booking_reminder", capture)
    customer, _ = await register(client)
    soon = (await book(client, customer, provider, tomorrow(), "09:00")).json()
    past = (await book(client, customer, provider, tomorrow(), "12:00")).json()
    for b in (soon, past):
        await client.post(f"/bookings/{b['id']}/accept", headers=provider["headers"])
    async with get_pool().acquire() as conn:
        await conn.execute("UPDATE bookings SET date = date - 5 WHERE id = $1", past["id"])
        # ensure "soon" starts within the next 24 hours
        await conn.execute(
            "UPDATE bookings SET date = (now() AT TIME ZONE $2 + interval '2 hours')::date, "
            "start_time = date_trunc('minute', now() AT TIME ZONE $2 + interval '2 hours')::time, "
            "end_time = date_trunc('minute', now() AT TIME ZONE $2 + interval '2 hours')::time + interval '1 minute' "
            "WHERE id = $1",
            soon["id"],
            __import__("app.core.config", fromlist=["get_settings"]).get_settings().app_timezone,
        )

    result = await run_jobs(get_pool())
    assert result["completed"] == 1
    assert [str(i) for i in reminded] == [soon["id"]]
    # reminders are only sent once
    assert (await run_jobs(get_pool()))["reminders"] == 0
