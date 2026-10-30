"""Public provider endpoints: search, profile pages, reviews, available slots."""
from datetime import date
from typing import List, Literal, Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, Query

from app.core.deps import get_db
from app.db.queries import availability as availability_q
from app.db.queries import providers as providers_q
from app.db.queries import reviews as reviews_q
from app.db.queries import services as services_q
from app.models.booking import ReviewOut
from app.models.common import CATEGORIES, Page
from app.models.provider import AvailabilityOut, ProviderDetail, ProviderSummary, ServiceOut, SlotsResponse
from app.services import availability as availability_service
from app.services.errors import not_found

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/categories", response_model=List[str])
async def categories():
    return CATEGORIES


@router.get("", response_model=Page[ProviderSummary])
async def search(
    q: Optional[str] = Query(None, max_length=100),
    category: Optional[str] = Query(None, max_length=50),
    location: Optional[str] = Query(None, max_length=100),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sort: Literal["rating", "price_asc", "price_desc", "newest"] = "rating",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows, total = await providers_q.search(
        conn,
        q=q.strip() if q else None,
        category=category or None,
        location=location.strip() if location else None,
        min_rating=min_rating,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        limit=page_size,
        offset=(page - 1) * page_size,
    )
    return Page.build([ProviderSummary.model_validate(dict(r)) for r in rows], total, page, page_size)


@router.get("/{provider_id}", response_model=ProviderDetail)
async def get_provider(provider_id: UUID, conn: asyncpg.Connection = Depends(get_db)):
    row = await providers_q.get_by_id(conn, provider_id)
    if not row:
        raise not_found("Provider")
    services = await services_q.list_for_provider(conn, provider_id)
    windows = await availability_q.list_windows(conn, provider_id)
    return ProviderDetail(
        **dict(row),
        services=[ServiceOut.model_validate(dict(s)) for s in services],
        availability=[AvailabilityOut.model_validate(dict(w)) for w in windows],
    )


@router.get("/{provider_id}/reviews", response_model=Page[ReviewOut])
async def provider_reviews(
    provider_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows, total = await reviews_q.list_for_provider(conn, provider_id, page_size, (page - 1) * page_size)
    return Page.build([ReviewOut.model_validate(dict(r)) for r in rows], total, page, page_size)


@router.get("/{provider_id}/slots", response_model=SlotsResponse)
async def slots(
    provider_id: UUID,
    service_id: UUID,
    date: date,
    conn: asyncpg.Connection = Depends(get_db),
):
    service = await services_q.get(conn, service_id)
    if not service or service["provider_id"] != provider_id or not service["is_active"]:
        raise not_found("Service")
    availability_service.check_bookable_date(date)
    blocked = await availability_q.is_blocked(conn, provider_id, date)
    slot_list = [] if blocked else await availability_service.available_slots(
        conn, provider_id, date, service["duration_minutes"]
    )
    return SlotsResponse(date=date, service_id=service_id, blocked=blocked, slots=slot_list)
