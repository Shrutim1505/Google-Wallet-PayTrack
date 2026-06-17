"""User entity model."""
from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    """Mirror of the user object returned by the auth endpoints."""

    id: str
    email: EmailStr
    name: str
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


__all__ = ["User"]
