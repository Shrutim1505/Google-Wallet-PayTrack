"""Custom exceptions raised by the framework — typed for clear pytest tracebacks."""
from __future__ import annotations


class FrameworkError(Exception):
    """Base exception for any framework-level error."""


class ConfigurationError(FrameworkError):
    """Raised when configuration is missing / invalid."""


class APIRequestError(FrameworkError):
    """
    Raised when an HTTP transport-level failure occurs (connection refused,
    timeout, DNS error). Application-level non-2xx is *not* an error here —
    use :class:`UnexpectedStatusError` if the test needs to assert.
    """


class UnexpectedStatusError(FrameworkError):
    """Raised when a response's status code does not match expectations."""

    def __init__(self, expected: int | tuple[int, ...], actual: int, body: str = "") -> None:
        self.expected = expected
        self.actual = actual
        self.body = body
        super().__init__(
            f"Expected status {expected}, got {actual}. Body: {body[:500]}"
        )


class SchemaValidationError(FrameworkError):
    """Raised when a JSON response fails schema validation."""


class DatabaseError(FrameworkError):
    """Raised on DB connection / query failures during validation."""


__all__ = [
    "APIRequestError",
    "ConfigurationError",
    "DatabaseError",
    "FrameworkError",
    "SchemaValidationError",
    "UnexpectedStatusError",
]
