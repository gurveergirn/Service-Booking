from fastapi import APIRouter

from app.api import auth, bookings, internal, provider_me, providers

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
# /providers/me must be registered before /providers/{provider_id}
api_router.include_router(provider_me.router)
api_router.include_router(providers.router)
api_router.include_router(bookings.router)
api_router.include_router(internal.router)
