import secrets

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import get_settings
from app.db.pool import get_pool
from app.jobs.scheduler import run_jobs

router = APIRouter(prefix="/internal", tags=["internal"], include_in_schema=False)


@router.post("/run-jobs")
async def trigger_jobs(x_cron_secret: str = Header(default="")):
    """For hosts where the in-process scheduler sleeps (e.g. Render free tier): point a cron at this."""
    expected = get_settings().cron_secret
    if not expected or not secrets.compare_digest(x_cron_secret, expected):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return await run_jobs(get_pool())
