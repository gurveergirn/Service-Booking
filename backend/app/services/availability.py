from datetime import date, timedelta
from typing import List
from uuid import UUID

import asyncpg

from app.core.config import get_settings
from app.core.timeutil import day_of_week, now_local
from app.db.queries import availability as availability_q
from app.db.queries import bookings as bookings_q
from app.models.provider import TimeSlot
from app.services.errors import bad_request
from app.services.slots import compute_slots


def check_bookable_date(d: date) -> None:
    today = now_local().date()
    if d < today:
        raise bad_request("Date is in the past")
    if d > today + timedelta(days=get_settings().booking_horizon_days):
        raise bad_request(f"Bookings open at most {get_settings().booking_horizon_days} days ahead")


async def available_slots(conn: asyncpg.Connection, provider_id: UUID, d: date, duration_minutes: int) -> List[TimeSlot]:
    """Weekly availability for the day, minus blocked dates, active bookings and past times."""
    if await availability_q.is_blocked(conn, provider_id, d):
        return []
    windows = [(w["start_time"], w["end_time"]) for w in await availability_q.list_windows(conn, provider_id, day_of_week(d))]
    if not windows:
        return []
    busy = [(b["start_time"], b["end_time"]) for b in await bookings_q.active_on_date(conn, provider_id, d)]
    now = now_local()
    slots = compute_slots(
        windows,
        busy,
        duration_minutes,
        get_settings().slot_interval_minutes,
        not_before=now.time() if d == now.date() else None,
    )
    return [TimeSlot(start_time=s, end_time=e) for s, e in slots]
