from datetime import date, datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.common import BookingStatus, Role


class BookingCreate(BaseModel):
    service_id: UUID
    date: date
    start_time: time


class BookingOut(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: str
    customer_email: str
    provider_id: UUID
    provider_name: str
    provider_email: str
    provider_category: str
    provider_avatar_url: Optional[str]
    service_id: UUID
    service_name: str
    duration_minutes: int
    date: date
    start_time: time
    end_time: time
    status: BookingStatus
    price: float
    cancelled_by: Optional[Role]
    created_at: datetime
    is_upcoming: bool
    has_review: bool


class EarningsSummary(BaseModel):
    total: float
    this_month: float
    completed_count: int


class RatingSummary(BaseModel):
    average: float
    count: int


class ProviderDashboard(BaseModel):
    today: List[BookingOut]
    pending: List[BookingOut]
    upcoming: List[BookingOut]
    earnings: EarningsSummary
    rating: RatingSummary


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


class ReviewOut(BaseModel):
    id: UUID
    booking_id: UUID
    provider_id: UUID
    customer_name: str
    service_name: str
    rating: int
    comment: str
    created_at: datetime
