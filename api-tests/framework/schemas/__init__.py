"""JSON-schema definitions used by the assertions to validate API contracts."""

from framework.schemas.auth_schema import (
    AUTH_RESULT_SCHEMA,
    LOGIN_REQUEST_SCHEMA,
    REGISTER_REQUEST_SCHEMA,
)
from framework.schemas.error_schema import PROBLEM_DETAILS_SCHEMA
from framework.schemas.receipt_schema import (
    RECEIPT_LIST_RESPONSE_SCHEMA,
    RECEIPT_SCHEMA,
)

__all__ = [
    "AUTH_RESULT_SCHEMA",
    "LOGIN_REQUEST_SCHEMA",
    "PROBLEM_DETAILS_SCHEMA",
    "RECEIPT_LIST_RESPONSE_SCHEMA",
    "RECEIPT_SCHEMA",
    "REGISTER_REQUEST_SCHEMA",
]
