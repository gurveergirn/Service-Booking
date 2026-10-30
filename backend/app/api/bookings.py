from typing import List, Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.core.deps import CurrentUser, get_current_user, get_db, get_provider_profile, require_customer
from app.core.timeutil import now_local
from app.db.queries import bookings as bookings_q
from app.db.queries import providers as providers_q
from app.models.booking import BookingCreate, BookingOut, ReviewCreate, ReviewOut
from app.services import bookings as booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


async def _provider_id_for(conn: asyncpg.Connection, user: CurrentUser) -> Optional[UUID]:
    if user.role != "PROVIDER":
        return None
    profile = await providers_q.get_by_user(conn, user.id)
    return profile["id"] if profile else None


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_customer),
    conn: asyncpg.Connection = Depends(get_db),
):
    return await booking_service.create_booking(conn, user, payload, background)


@router.get("/me", response_model=List[BookingOut])
async def my_bookings(user: CurrentUser = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_db)):
    """All bookings for the signed-in user (as customer, or as provider)."""
    now = now_local()
    if user.role == "CUSTOMER":
        rows = await bookings_q.list_for_customer(conn, user.id)
    else:
        provider_id = await _provider_id_for(conn, user)
        rows = await bookings_q.list_for_provider(conn, provider_id, ascending=False) if provider_id else []
    return [booking_service.to_out(r, now) for r in rows]


@router.post("/{booking_id}/accept", response_model=BookingOut)
async def accept(booking_id: UUID, background: BackgroundTasks, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    return await booking_service.accept(conn, profile["id"], booking_id, background)


@router.post("/{booking_id}/decline", response_model=BookingOut)
async def decline(booking_id: UUID, background: BackgroundTasks, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    return await booking_service.decline(conn, profile["id"], booking_id, background)


@router.post("/{booking_id}/complete", response_model=BookingOut)
async def complete(booking_id: UUID, profile=Depends(get_provider_profile), conn: asyncpg.Connection = Depends(get_db)):
    return await booking_service.complete(conn, profile["id"], booking_id)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel(
    booking_id: UUID,
    background: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
):
    return await booking_service.cancel(conn, user, await _provider_id_for(conn, user), booking_id, background)


@router.post("/{booking_id}/review", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def review(
    booking_id: UUID,
    payload: ReviewCreate,
    user: CurrentUser = Depends(require_customer),
    conn: asyncpg.Connection = Depends(get_db),
):
    return await booking_service.review(conn, user, booking_id, payload)
