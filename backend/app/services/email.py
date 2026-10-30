import html
import logging
from typing import Iterable

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


async def send_email(to: str, subject: str, html_body: str) -> None:
    """Send via Resend; without an API key, log instead so local dev works offline.
    Never raises: a failed email must not fail the request that triggered it."""
    settings = get_settings()
    if not settings.resend_api_key:
        logger.info("[email disabled] to=%s subject=%r", to, subject)
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={"from": settings.email_from, "to": [to], "subject": subject, "html": html_body},
            )
        if response.status_code >= 400:
            logger.warning("Resend rejected email to %s: %s %s", to, response.status_code, response.text)
    except httpx.HTTPError:
        logger.exception("Failed to send email to %s", to)


def render(heading: str, paragraphs: Iterable[str], cta_label: str = "", cta_url: str = "") -> str:
    """Minimal inline-styled layout. Paragraphs are escaped; callers pass plain text."""
    body = "".join(f'<p style="margin:0 0 12px;line-height:1.5">{html.escape(p)}</p>' for p in paragraphs)
    button = ""
    if cta_label and cta_url:
        button = (
            f'<p style="margin:24px 0"><a href="{html.escape(cta_url, quote=True)}" '
            'style="background:#0f766e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;'
            f'font-weight:600">{html.escape(cta_label)}</a></p>'
        )
    return (
        '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;'
        'padding:24px;color:#0f172a">'
        '<p style="font-weight:700;color:#0f766e;font-size:18px;margin:0 0 24px">BookWell</p>'
        f'<h1 style="font-size:20px;margin:0 0 16px">{html.escape(heading)}</h1>'
        f"{body}{button}"
        '<p style="color:#64748b;font-size:12px;margin-top:32px">You are receiving this because you have a BookWell account.</p>'
        "</div>"
    )
