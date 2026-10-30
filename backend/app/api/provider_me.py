"""Endpoints for the signed-in provider to manage their own profile, services and availability."""
from typing import List
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, Query, Response, status

from app.core.deps import CurrentUser, get_db, get_provider_profile, require_provider
from app.core.timeutil import now_local
from app.db.queries import availability as availability_q
from app.db.queries import bookings as bookings_q
from app.db.queries import providers as providers_q
from app.db.queries import reviews as reviews_q
from app.db.queries import services as services_q
from app.models.booking import EarningsSummary, ProviderDashboard, RatingSummary, ReviewOut
from app.models.common import Page
from app.models.provider import (
    AvailabilityOut,
    BlockedDateIn,
    BlockedDateOut,
    ProviderProfileIn,
    ProviderSummary,
    ServiceIn,
    ServiceOut,
    WeeklyAvailabilityIn,
)
from app.services.bookings import month_start, to_out
from app.services.errors import not_found

router = APIRouter(prefix="/providers/me", tags=["provider: me"])


@router.get("", response_model=ProviderSummary)
async def get_my_profile(profile: asyncpg.Record = Depends(get_provider_profile)):
    return ProviderSummary.model_validate(dict(profile))


@router.put("", response_model=ProviderSummary)
async def upsert_my_profile(
    payload: ProviderProfileIn,
    user: CurrentUser = Depends(require_provider),
    conn: asyncpg.Connection = Depends(get_db),
):
    await providers_q.upsert_profile(
        conn, user.id, payload.bio.strip(), payload.category, payload.location, payload.hourly_rate, payload.avatar_url
    )
    return ProviderSummary.model_validate(dict(await providers_q.get_by_user(conn, user.id)))


# --- services ---------------------------------------------------------------


@router.get("/services", response_model=List[ServiceOut])
async def list_services(profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    return [ServiceOut.model_validate(dict(r)) for r in await services_q.list_for_provider(conn, profile["id"])]


@router.post("/services", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(payload: ServiceIn, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    row = await services_q.create(
        conn, profile["id"], payload.name.strip(), payload.description.strip(), payload.duration_minutes, payload.price
    )
    return ServiceOut.model_validate(dict(row))


@router.put("/services/{service_id}", response_model=ServiceOut)
async def update_service(
    service_id: UUID, payload: ServiceIn, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)
):
    row = await services_q.update(
        conn, profile["id"], service_id, payload.name.strip(), payload.description.strip(), payload.duration_minutes, payload.price
    )
    if not row:
        raise not_found("Service")
    return ServiceOut.model_validate(dict(row))


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(service_id: UUID, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    if not await services_q.deactivate(conn, profile["id"], service_id):
        raise not_found("Service")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- availability -------------------------------------------------------------


@router.get("/availability", response_model=List[AvailabilityOut])
async def get_availability(profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    return [AvailabilityOut.model_validate(dict(r)) for r in await availability_q.list_windows(conn, profile["id"])]


@router.put("/availability", response_model=List[AvailabilityOut])
async def set_availability(
    payload: WeeklyAvailabilityIn, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)
):
    await availability_q.replace_windows(conn, profile["id"], [(w.day_of_week, w.start_time, w.end_time) for w in payload.windows])
    return [AvailabilityOut.model_validate(dict(r)) for r in await availability_q.list_windows(conn, profile["id"])]


@router.get("/blocked-dates", response_model=List[BlockedDateOut])
async def list_blocked_dates(profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    rows = await availability_q.list_blocked(conn, profile["id"], now_local().date())
    return [BlockedDateOut.model_validate(dict(r)) for r in rows]


@router.post("/blocked-dates", response_model=BlockedDateOut, status_code=status.HTTP_201_CREATED)
async def add_blocked_date(payload: BlockedDateIn, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    row = await availability_q.add_blocked(conn, profile["id"], payload.date, payload.reason)
    return BlockedDateOut.model_validate(dict(row))


@router.delete("/blocked-dates/{blocked_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_blocked_date(blocked_id: UUID, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    if not await availability_q.remove_blocked(conn, profile["id"], blocked_id):
        raise not_found("Blocked date")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- dashboard & reviews -----------------------------------------------------


@router.get("/dashboard", response_model=ProviderDashboard)
async def dashboard(profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    now = now_local()
    today = now.date()
    pid = profile["id"]
    todays = await bookings_q.list_for_provider(
        conn, pid, statuses=["CONFIRMED", "COMPLETED"], from_date=today, to_date=today
    )
    pending = await bookings_q.list_for_provider(conn, pid, statuses=["PENDING"], from_date=today)
    upcoming = await bookings_q.list_for_provider(conn, pid, statuses=["CONFIRMED"], from_date=today)
    earnings = await bookings_q.earnings(conn, pid, month_start(today))
    return ProviderDashboard(
        today=[to_out(r, now) for r in todays],
        pending=[b for b in (to_out(r, now) for r in pending) if b.is_upcoming],
        upcoming=[b for b in (to_out(r, now) for r in upcoming) if b.is_upcoming and b.date > today][:20],
        earnings=EarningsSummary(**dict(earnings)),
        rating=RatingSummary(average=profile["avg_rating"], count=profile["review_count"]),
    )


@router.get("/reviews", response_model=Page[ReviewOut])
async def my_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    profile=Depends(get_provider_profile),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows, total = await reviews_q.list_for_provider(conn, profile["id"], page_size, (page - 1) * page_size)
    return Page.build([ReviewOut.model_validate(dict(r)) for r in rows], total, page, page_size)
