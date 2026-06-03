"""JSON schemas for auth-endpoint contract validation."""
from __future__ import annotations

from typing import Any

REGISTER_REQUEST_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["email", "password", "name"],
    "properties": {
        "email": {"type": "string", "format": "email"},
        "password": {"type": "string", "minLength": 8},
        "name": {"type": "string", "minLength": 2, "maxLength": 100},
    },
    "additionalProperties": False,
}

LOGIN_REQUEST_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["email", "password"],
    "properties": {
        "email": {"type": "string", "format": "email"},
        "password": {"type": "string"},
    },
    "additionalProperties": False,
}

USER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["id", "email", "name", "roles", "permissions"],
    "properties": {
        "id": {"type": "string"},
        "email": {"type": "string", "format": "email"},
        "name": {"type": "string"},
        "roles": {"type": "array", "items": {"type": "string"}},
        "permissions": {"type": "array", "items": {"type": "string"}},
    },
}

AUTH_RESULT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["user", "token", "refreshToken"],
    "properties": {
        "user": USER_SCHEMA,
        "token": {"type": "string", "minLength": 20},
        "refreshToken": {"type": "string", "minLength": 20},
    },
}

VERIFY_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["userId", "email", "roles", "permissions"],
    "properties": {
        "userId": {"type": "string"},
        "email": {"type": "string"},
        "roles": {"type": "array", "items": {"type": "string"}},
        "permissions": {"type": "array", "items": {"type": "string"}},
    },
}

__all__ = [
    "AUTH_RESULT_SCHEMA",
    "LOGIN_REQUEST_SCHEMA",
    "REGISTER_REQUEST_SCHEMA",
    "USER_SCHEMA",
    "VERIFY_RESPONSE_SCHEMA",
]
