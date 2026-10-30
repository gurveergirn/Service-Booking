from datetime import date, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.common import CATEGORIES


class ProviderProfileIn(BaseModel):
    bio: str = Field(default="", max_length=2000)
    category: str
    location: str = Field(min_length=2, max_length=120)
    hourly_rate: float = Field(ge=0, le=10000)
    avatar_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("category")
    @classmethod
    def known_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(CATEGORIES)}")
        return v

    @field_validator("location")
    @classmethod
    def strip_location(cls, v: str) -> str:
        return v.strip()

    @field_validator("avatar_url")
    @classmethod
    def http_url(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("Avatar URL must start with http:// or https://")
        return v


class ProviderSummary(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    bio: str
    category: str
    location: str
    hourly_rate: float
    avatar_url: Optional[str]
    avg_rating: float
    review_count: int
    starting_price: float


class ServiceIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1000)
    duration_minutes: int = Field(ge=5, le=720)
    price: float = Field(ge=0, le=100000)


class ServiceOut(BaseModel):
    id: UUID
    provider_id: UUID
    name: str
    description: str
    duration_minutes: int
    price: float
    is_active: bool


class AvailabilityWindow(BaseModel):
    day_of_week: int = Field(ge=0, le=6, description="0 = Sunday ... 6 = Saturday")
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def start_before_end(self):
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class AvailabilityOut(AvailabilityWindow):
    id: UUID


class WeeklyAvailabilityIn(BaseModel):
    windows: List[AvailabilityWindow] = Field(max_length=70)

    @model_validator(mode="after")
    def no_overlaps(self):
        by_day = {}
        for w in self.windows:
            by_day.setdefault(w.day_of_week, []).append(w)
        for day, windows in by_day.items():
            windows.sort(key=lambda w: w.start_time)
            for a, b in zip(windows, windows[1:]):
                if b.start_time < a.end_time:
                    raise ValueError(f"Availability windows overlap on day {day}")
        return self


class BlockedDateIn(BaseModel):
    date: date
    reason: Optional[str] = Field(default=None, max_length=200)


class BlockedDateOut(BlockedDateIn):
    id: UUID


class ProviderDetail(ProviderSummary):
    services: List[ServiceOut]
    availability: List[AvailabilityOut]


class TimeSlot(BaseModel):
    start_time: time
    end_time: time


class SlotsResponse(BaseModel):
    date: date
    service_id: UUID
    blocked: bool
    slots: List[TimeSlot]
