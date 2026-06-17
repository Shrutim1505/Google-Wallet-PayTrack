"""
Domain-aware custom assertions, each wrapped in an Allure step.

Using these instead of bare ``assert`` gives the Allure timeline a
human-readable narrative ("Step: assert status is 201") and makes
failure messages consistent across the suite.
"""
from __future__ import annotations

from typing import Any, Iterable

import allure
import jsonschema

from framework.core.exceptions import (
    SchemaValidationError,
    UnexpectedStatusError,
)
from framework.core.response import APIResponse


# -----------------------------------------------------------------------------
#  Status helpers
# -----------------------------------------------------------------------------


def assert_status(response: APIResponse, expected: int | Iterable[int]) -> None:
    """Assert the response status code matches one of the expected codes."""
    expected_set: tuple[int, ...] = (
        (expected,) if isinstance(expected, int) else tuple(expected)
    )
    with allure.step(f"Assert status is in {expected_set}"):
        if response.status_code not in expected_set:
            raise UnexpectedStatusError(
                expected=expected_set if len(expected_set) > 1 else expected_set[0],
                actual=response.status_code,
                body=response.text,
            )


def assert_ok(response: APIResponse) -> None:
    assert_status(response, 200)


def assert_created(response: APIResponse) -> None:
    assert_status(response, 201)


def assert_unauthorized(response: APIResponse) -> None:
    assert_status(response, 401)


def assert_forbidden(response: APIResponse) -> None:
    assert_status(response, 403)


def assert_bad_request(response: APIResponse) -> None:
    assert_status(response, 400)


def assert_not_found(response: APIResponse) -> None:
    assert_status(response, 404)


def assert_conflict(response: APIResponse) -> None:
    assert_status(response, 409)


def assert_validation_error(response: APIResponse) -> None:
    assert_status(response, 422)


# -----------------------------------------------------------------------------
#  Envelope helpers
# -----------------------------------------------------------------------------


def assert_success_envelope(response: APIResponse) -> None:
    """Assert the body matches PayTrack's success envelope shape."""
    with allure.step("Assert response is a success envelope"):
        body = response.json()
        assert isinstance(body, dict), f"Expected JSON object, got {type(body).__name__}"
        assert body.get("success") is True, f"`success` is not True: {body}"
        assert "data" in body, "`data` field missing from envelope"


def assert_problem_response(response: APIResponse, *, code: str | None = None) -> None:
    """Assert the body matches RFC 7807 problem-details shape."""
    with allure.step(f"Assert RFC-7807 problem (code={code or 'any'})"):
        assert response.is_problem, (
            f"Expected problem+json response. Got: {response.text[:300]}"
        )
        if code:
            assert response.error_code == code, (
                f"Expected error code '{code}', got '{response.error_code}'"
            )


def assert_field_error(response: APIResponse, field: str) -> None:
    """Assert a 422 validation response contains an error for ``field``."""
    with allure.step(f"Assert validation error mentions field '{field}'"):
        fields = [e.get("field") for e in response.field_errors]
        assert field in fields, (
            f"Expected validation error for '{field}'. Got fields: {fields}"
        )


# -----------------------------------------------------------------------------
#  Schema validation
# -----------------------------------------------------------------------------


def assert_schema(payload: Any, schema: dict[str, Any], *, name: str = "schema") -> None:
    """Validate ``payload`` against a JSON schema. Raises on mismatch."""
    with allure.step(f"Validate against {name}"):
        try:
            jsonschema.validate(payload, schema)
        except jsonschema.ValidationError as exc:
            raise SchemaValidationError(
                f"{name} validation failed: {exc.message} at {list(exc.absolute_path)}"
            ) from exc


# -----------------------------------------------------------------------------
#  Field-level helpers
# -----------------------------------------------------------------------------


def assert_keys_present(payload: dict[str, Any], keys: Iterable[str]) -> None:
    """Assert every key in ``keys`` exists in ``payload``."""
    missing = [k for k in keys if k not in payload]
    with allure.step(f"Assert keys present: {list(keys)}"):
        assert not missing, f"Missing keys: {missing}. Got: {list(payload.keys())}"


def assert_eq(actual: Any, expected: Any, *, label: str = "value") -> None:
    with allure.step(f"Assert {label} == {expected!r}"):
        assert actual == expected, f"{label} mismatch: expected {expected!r}, got {actual!r}"


def assert_in(needle: Any, haystack: Iterable[Any], *, label: str = "value") -> None:
    with allure.step(f"Assert {label} ∈ {haystack!r}"):
        assert needle in haystack, f"{label} {needle!r} not in {list(haystack)}"


__all__ = [
    "assert_bad_request",
    "assert_conflict",
    "assert_created",
    "assert_eq",
    "assert_field_error",
    "assert_forbidden",
    "assert_in",
    "assert_keys_present",
    "assert_not_found",
    "assert_ok",
    "assert_problem_response",
    "assert_schema",
    "assert_status",
    "assert_success_envelope",
    "assert_unauthorized",
    "assert_validation_error",
]
