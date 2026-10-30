"""Booking-related emails. Each takes a booking row from queries.bookings.BOOKING_SELECT."""
from typing import Mapping

from app.core.config import get_settings
from app.services.email import render, send_email


def _when(b: Mapping) -> str:
    return f"{b['date']:%A, %B %-d, %Y} at {b['start_time']:%-I:%M %p}"


def _what(b: Mapping) -> str:
    return f"{b['service_name']} ({b['duration_minutes']} min, ${float(b['price']):.2f})"


def _dashboard() -> str:
    return f"{get_settings().frontend_url}/dashboard"


async def booking_requested(b: Mapping) -> None:
    await send_email(
        b["customer_email"],
        f"Booking request sent to {b['provider_name']}",
        render(
            "Your booking request was sent",
            [
                f"Hi {b['customer_name']},",
                f"You requested {_what(b)} with {b['provider_name']} on {_when(b)}.",
                "We'll email you as soon as the provider confirms.",
            ],
            "View booking",
            _dashboard(),
        ),
    )
    await send_email(
        b["provider_email"],
        f"New booking request from {b['customer_name']}",
        render(
            "You have a new booking request",
            [
                f"{b['customer_name']} requested {_what(b)} on {_when(b)}.",
                "Accept or decline it from your dashboard.",
            ],
            "Review request",
            _dashboard(),
        ),
    )


async def booking_confirmed(b: Mapping) -> None:
    await send_email(
        b["customer_email"],
        f"Confirmed: {b['service_name']} with {b['provider_name']}",
        render(
            "Your booking is confirmed",
            [f"Hi {b['customer_name']},", f"{b['provider_name']} confirmed {_what(b)} on {_when(b)}."],
            "View booking",
            _dashboard(),
        ),
    )
    await send_email(
        b["provider_email"],
        f"Confirmed: {b['customer_name']} on {b['date']:%b %-d}",
        render(
            "Booking confirmed",
            [f"You confirmed {_what(b)} with {b['customer_name']} on {_when(b)}."],
            "Open schedule",
            _dashboard(),
        ),
    )


async def booking_declined(b: Mapping) -> None:
    await send_email(
        b["customer_email"],
        f"{b['provider_name']} couldn't take your booking",
        render(
            "Your booking request was declined",
            [
                f"Hi {b['customer_name']},",
                f"Unfortunately {b['provider_name']} can't do {b['service_name']} on {_when(b)}.",
                "Try another time slot or browse other providers.",
            ],
            "Find another time",
            f"{get_settings().frontend_url}/providers/{b['provider_id']}",
        ),
    )


async def booking_cancelled(b: Mapping, cancelled_by: str) -> None:
    if cancelled_by == "CUSTOMER":
        to, name, other = b["provider_email"], b["provider_name"], b["customer_name"]
    else:
        to, name, other = b["customer_email"], b["customer_name"], b["provider_name"]
    await send_email(
        to,
        f"Cancelled: {b['service_name']} on {b['date']:%b %-d}",
        render(
            "A booking was cancelled",
            [f"Hi {name},", f"{other} cancelled {_what(b)} scheduled for {_when(b)}."],
            "Open dashboard",
            _dashboard(),
        ),
    )


async def booking_reminder(b: Mapping) -> None:
    await send_email(
        b["customer_email"],
        f"Reminder: {b['service_name']} tomorrow",
        render(
            "Your appointment is coming up",
            [f"Hi {b['customer_name']},", f"Reminder: {_what(b)} with {b['provider_name']} on {_when(b)}."],
            "View booking",
            _dashboard(),
        ),
    )
    await send_email(
        b["provider_email"],
        f"Reminder: {b['customer_name']} tomorrow",
        render(
            "Upcoming appointment",
            [f"Reminder: {_what(b)} with {b['customer_name']} on {_when(b)}."],
            "Open schedule",
            _dashboard(),
        ),
    )


async def password_reset(to: str, name: str, token: str) -> None:
    settings = get_settings()
    await send_email(
        to,
        "Reset your BookWell password",
        render(
            "Reset your password",
            [
                f"Hi {name},",
                "We received a request to reset your password. The link below expires in "
                f"{settings.password_reset_expire_minutes} minutes.",
                "If you didn't ask for this, you can ignore this email.",
            ],
            "Choose a new password",
            f"{settings.frontend_url}/reset-password?token={token}",
        ),
    )
