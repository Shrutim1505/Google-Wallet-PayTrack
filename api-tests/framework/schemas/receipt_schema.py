"""JSON schemas for receipt-endpoint contract validation."""
from __future__ import annotations

from typing import Any

RECEIPT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["id", "merchant", "amount", "date", "category", "items"],
    "properties": {
        "id": {"type": "string"},
        "merchant": {"type": "string", "minLength": 1},
        "amount": {"type": "number"},
        "date": {"type": "string", "pattern": r"^\d{4}-\d{2}-\d{2}$"},
        "category": {
            "type": "string",
            "enum": [
                "Food", "Transport", "Shopping",
                "Bills", "Entertainment", "Health", "Other",
            ],
        },
        "items": {"type": "array"},
    },
}

PAGINATION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["page", "limit", "total", "hasMore"],
    "properties": {
        "page": {"type": "integer", "minimum": 1},
        "limit": {"type": "integer", "minimum": 1},
        "total": {"type": "integer", "minimum": 0},
        "hasMore": {"type": "boolean"},
    },
}

RECEIPT_LIST_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["success", "data", "pagination"],
    "properties": {
        "success": {"type": "boolean"},
        "data": {"type": "array", "items": RECEIPT_SCHEMA},
        "pagination": PAGINATION_SCHEMA,
        "message": {"type": "string"},
    },
}

__all__ = [
    "PAGINATION_SCHEMA",
    "RECEIPT_LIST_RESPONSE_SCHEMA",
    "RECEIPT_SCHEMA",
]
