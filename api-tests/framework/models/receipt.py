"""Receipt entity model — matches the frontend-shaped payload returned by the API."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Receipt(BaseModel):
    """Receipt object returned by the API (frontend-friendly shape)."""

    id: str
    merchant: str
    amount: float
    date: str  # YYYY-MM-DD
    category: str
    items: list[dict[str, Any]] = Field(default_factory=list)


__all__ = ["Receipt"]
