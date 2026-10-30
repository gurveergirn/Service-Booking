import math
from typing import Generic, List, Literal, TypeVar

from pydantic import BaseModel

Role = Literal["CUSTOMER", "PROVIDER"]
BookingStatus = Literal["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]

CATEGORIES: List[str] = [
    "Barber",
    "Hair Stylist",
    "Tutor",
    "Cleaner",
    "Personal Trainer",
    "Massage Therapist",
    "Photographer",
    "Pet Groomer",
    "Nail Technician",
    "Music Teacher",
]

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def build(cls, items: List[T], total: int, page: int, page_size: int) -> "Page[T]":
        return cls(items=items, total=total, page=page, page_size=page_size, pages=math.ceil(total / page_size) if total else 0)


class Message(BaseModel):
    message: str
