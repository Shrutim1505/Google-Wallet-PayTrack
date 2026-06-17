"""RFC 7807 problem-details schema used by every error-path test."""
from __future__ import annotations

from typing import Any

PROBLEM_DETAILS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["type", "title", "status"],
    "properties": {
        "type": {"type": "string"},
        "title": {"type": "string"},
        "status": {"type": "integer"},
        "code": {"type": "string"},
        "detail": {"type": ["string", "null"]},
        "instance": {"type": "string"},
        "traceId": {"type": "string"},
        "errors": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["field", "message"],
                "properties": {
                    "field": {"type": "string"},
                    "message": {"type": "string"},
                },
            },
        },
    },
}

__all__ = ["PROBLEM_DETAILS_SCHEMA"]
