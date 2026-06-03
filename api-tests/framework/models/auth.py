"""Auth-related Pydantic models — used to typecheck responses in tests."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from framework.models.user import User


class AuthResult(BaseModel):
    """Body of ``data`` for /auth/register and /auth/login responses."""

    user: User
    token: str
    refreshToken: str = Field(..., alias="refreshToken")

    model_config = {"populate_by_name": True}


class TokenPayload(BaseModel):
    """Decoded JWT payload."""

    sub: str
    email: str
    roles: list[str] = []
    permissions: list[str] = []
    type: Literal["access", "refresh"] | None = None
    iat: int | None = None
    exp: int | None = None


__all__ = ["AuthResult", "TokenPayload"]
