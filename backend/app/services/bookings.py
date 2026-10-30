from datetime import date, datetime
from typing import Mapping, Optional
from uuid import UUID

import asyncpg
from fastapi import BackgroundTasks

from app.core.deps import CurrentUser
from app.core.timeutil import day_of_week, now_local
from app.db.queries import availability as availability_q
from app.db.queries import bookings as bookings_q
from app.db.queries import providers as providers_q
from app.db.queries import reviews as reviews_q
from app.db.queries import services as services_q
from app.models.booking import BookingCreate, BookingOut, ReviewCreate, ReviewOut
from app.services import notifications
from app.services.availability import check_bookable_date
from app.services.errors import bad_request, conflict, forbidden, not_found
from app.services.slots import add_minutes, fits_in_windows, overlaps, to_minutes


def to_out(row: Mapping, now: Optional[datetime] = None) -> BookingOut:
    now = now or now_local()
    ends_at = datetime.combine(row["date"], row["end_time"])
    data = dict(row)
    data["is_upcoming"] = row["status"] in bookings_q.ACTIVE_STATUSES and ends_at > now
    return BookingOut.model_validate(data)


def _starts_at(row: Mapping) -> datetime:
    return datetime.combine(row["date"], row["start_time"])


async def create_booking(
    conn: asyncpg.Connection, customer: CurrentUser, payload: BookingCreate, background: BackgroundTasks
) -> BookingOut:
    service = await services_q.get(conn, payload.service_id)
    if not service or not service["is_active"]:
        raise not_found("Service")
    provider_id: UUID = service["provider_id"]
    check_bookable_date(payload.date)

    start = payload.start_time.replace(second=0, microsecond=0)
    end = add_minutes(start, service["duration_minutes"])
    if end is None:
        raise bad_request("Appointment would run past midnight")
    if datetime.combine(payload.date, start) <= now_local():
        raise bad_request("That time has already passed")

    async with conn.transaction():
        # Lock the provider row: concurrent booking attempts for this provider queue up here,
        # so the conflict check below sees every booking committed before ours.
        await providers_q.lock_provider(conn, provider_id)

        if await availability_q.is_blocked(conn, provider_id, payload.date):
            raise conflict("The provider is unavailable on that date")
        windows = [
            (w["start_time"], w["end_time"])
            for w in await availability_q.list_windows(conn, provider_id, day_of_week(payload.date))
        ]
        if not fits_in_windows(windows, start, end):
            raise conflict("That time is outside the provider's working hours")

        existing = await bookings_q.active_on_date(conn, provider_id, payload.date, lock=True)
        s, e = to_minutes(start), to_minutes(end)
        if any(overlaps(s, e, to_minutes(b["start_time"]), to_minutes(b["end_time"])) for b in existing):
            raise conflict("Sorry, that time slot was just taken. Please pick another.")

        try:
            booking_id = await bookings_q.insert(
                conn, customer.id, provider_id, service["id"], payload.date, start, end, service["price"]
            )
        except asyncpg.ExclusionViolationError:
            # Defence in depth: the bookings_no_overlap constraint caught a race
            raise conflict("Sorry, that time slot was just taken. Please pick another.")

    row = await bookings_q.get(conn, booking_id)
    background.add_task(notifications.booking_requested, dict(row))
    return to_out(row)


async def _load(conn: asyncpg.Connection, booking_id: UUID) -> asyncpg.Record:
    row = await bookings_q.get(conn, booking_id)
    if not row:
        raise not_found("Booking")
    return row


def _require_provider_owns(row: Mapping, provider_profile_id: UUID) -> None:
    if row["provider_id"] != provider_profile_id:
        raise not_found("Booking")


async def accept(conn: asyncpg.Connection, provider_profile_id: UUID, booking_id: UUID, background: BackgroundTasks) -> BookingOut:
    row = await _load(conn, booking_id)
    _require_provider_owns(row, provider_profile_id)
    if _starts_at(row) <= now_local():
        raise bad_request("This booking has already started")
    if not await bookings_q.transition(conn, booking_id, ["PENDING"], "CONFIRMED"):
        raise conflict("Only pending bookings can be accepted")
    row = await bookings_q.get(conn, booking_id)
    background.add_task(notifications.booking_confirmed, dict(row))
    return to_out(row)


async def decline(conn: asyncpg.Connection, provider_profile_id: UUID, booking_id: UUID, background: BackgroundTasks) -> BookingOut:
    row = await _load(conn, booking_id)
    _require_provider_owns(row, provider_profile_id)
    if not await bookings_q.transition(conn, booking_id, ["PENDING"], "CANCELLED", "PROVIDER"):
        raise conflict("Only pending bookings can be declined")
    row = await bookings_q.get(conn, booking_id)
    background.add_task(notifications.booking_declined, dict(row))
    return to_out(row)


async def complete(conn: asyncpg.Connection, provider_profile_id: UUID, booking_id: UUID) -> BookingOut:
    row = await _load(conn, booking_id)
    _require_provider_owns(row, provider_profile_id)
    if _starts_at(row) > now_local():
        raise bad_request("You can only complete an appointment once it has started")
    if not await bookings_q.transition(conn, booking_id, ["CONFIRMED"], "COMPLETED"):
        raise conflict("Only confirmed bookings can be marked complete")
    return to_out(await bookings_q.get(conn, booking_id))


async def cancel(
    conn: asyncpg.Connection,
    user: CurrentUser,
    provider_profile_id: Optional[UUID],
    booking_id: UUID,
    background: BackgroundTasks,
) -> BookingOut:
    row = await _load(conn, booking_id)
    is_customer = user.role == "CUSTOMER" and row["customer_id"] == user.id
    is_provider = user.role == "PROVIDER" and provider_profile_id is not None and row["provider_id"] == provider_profile_id
    if not (is_customer or is_provider):
        raise not_found("Booking")
    if _starts_at(row) <= now_local():
        raise bad_request("Past appointments can't be cancelled")
    if not await bookings_q.transition(conn, booking_id, bookings_q.ACTIVE_STATUSES, "CANCELLED", user.role):
        raise conflict("This booking can no longer be cancelled")
    row = await bookings_q.get(conn, booking_id)
    background.add_task(notifications.booking_cancelled, dict(row), user.role)
    return to_out(row)


async def review(conn: asyncpg.Connection, customer: CurrentUser, booking_id: UUID, payload: ReviewCreate) -> ReviewOut:
    row = await _load(conn, booking_id)
    if row["customer_id"] != customer.id:
        raise forbidden()
    if row["status"] != "COMPLETED":
        raise bad_request("You can review an appointment once it is completed")
    try:
        created = await reviews_q.create(conn, booking_id, customer.id, row["provider_id"], payload.rating, payload.comment.strip())
    except asyncpg.UniqueViolationError:
        raise conflict("You already reviewed this appointment")
    return ReviewOut.model_validate(dict(created))


def month_start(d: date) -> date:
    return d.replace(day=1)
