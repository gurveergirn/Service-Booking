import asyncpg
from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.core.deps import CurrentUser, get_current_user, get_db
from app.db.queries import users as users_q
from app.models.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)
from app.models.common import Message
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, conn: asyncpg.Connection = Depends(get_db)):
    return await auth_service.register(conn, payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, conn: asyncpg.Connection = Depends(get_db)):
    return await auth_service.login(conn, payload.email, payload.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, conn: asyncpg.Connection = Depends(get_db)):
    return await auth_service.refresh(conn, payload.refresh_token)


@router.post("/forgot-password", response_model=Message, status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    payload: ForgotPasswordRequest, background: BackgroundTasks, conn: asyncpg.Connection = Depends(get_db)
):
    await auth_service.forgot_password(conn, payload.email, background)
    return Message(message="If an account exists for that email, a reset link is on its way.")


@router.post("/reset-password", response_model=Message)
async def reset_password(payload: ResetPasswordRequest, conn: asyncpg.Connection = Depends(get_db)):
    await auth_service.reset_password(conn, payload.token, payload.new_password)
    return Message(message="Password updated. You can now log in.")


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_db)):
    return auth_service.user_out(await users_q.get_by_id(conn, user.id))
