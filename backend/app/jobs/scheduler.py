"""Periodic housekeeping: 24-hour reminders and status roll-overs.

Runs in-process (see app.main lifespan) and can also be triggered by an external
cron via POST /api/v1/internal/run-jobs or `python -m app.jobs.scheduler`.
"""
import asyncio
import logging
from datetime import timedelta
from typing import Dict

import asyncpg

from app.core.config import get_settings
from app.core.timeutil import now_local
from app.db.queries import bookings as bookings_q
from app.services import notifications

logger = logging.getLogger(__name__)


async def run_jobs(pool: asyncpg.Pool) -> Dict[str, int]:
    now = now_local()
    async with pool.acquire() as conn:
        completed = await bookings_q.complete_past(conn, now)
        expired = await bookings_q.expire_stale_pending(conn, now)
        reminder_ids = await bookings_q.claim_due_reminders(conn, now, now + timedelta(hours=24))
        bookings = [await bookings_q.get(conn, booking_id) for booking_id in reminder_ids]
    for booking in bookings:
        await notifications.booking_reminder(dict(booking))
    result = {"completed": completed, "expired": expired, "reminders": len(bookings)}
    if any(result.values()):
        logger.info("Jobs ran: %s", result)
    return result


async def run_forever(pool: asyncpg.Pool) -> None:
    interval = get_settings().scheduler_interval_seconds
    while True:
        try:
            await run_jobs(pool)
        except Exception:  # keep the loop alive; the next tick retries
            logger.exception("Scheduled jobs failed")
        await asyncio.sleep(interval)


if __name__ == "__main__":
    from app.db.pool import close_pool, init_pool

    async def _main() -> None:
        pool = await init_pool()
        try:
            print(await run_jobs(pool))
        finally:
            await close_pool()

    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())
