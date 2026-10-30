from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.config import get_settings


def now_local() -> datetime:
    """Current wall-clock time in the app timezone, as a naive datetime.

    Booking dates/times are stored as naive DATE + TIME in the provider's local
    time, so all comparisons happen in naive local time.
    """
    return datetime.now(ZoneInfo(get_settings().app_timezone)).replace(tzinfo=None)


def today_local() -> date:
    return now_local().date()


def day_of_week(d: date) -> int:
    """0 = Sunday ... 6 = Saturday (matches JavaScript's Date.getDay())."""
    return (d.weekday() + 1) % 7
