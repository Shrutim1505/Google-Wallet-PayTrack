"""Steps shared across feature files."""
from __future__ import annotations

import re

from behave import given, then  # type: ignore[attr-defined]

from framework.core.assertions import (
    assert_keys_present,
    assert_problem_response,
    assert_success_envelope,
)
from framework.utils.retry import wait_for_health


# -----------------------------------------------------------------------------
#  Backgrounds
# -----------------------------------------------------------------------------


@given("the API is reachable")
def step_api_is_reachable(context):
    """Probe ``/health/live`` once per scenario — fail fast if backend is down."""
    settings = context.settings
    wait_for_health(f"{settings.api.base_url}/health/live", attempts=3, max_wait=5.0)


# -----------------------------------------------------------------------------
#  Generic response assertions
# -----------------------------------------------------------------------------


@then("the response status should be {status:d}")
def step_response_status_is(context, status: int):
    actual = context.tc.response.status_code
    assert actual == status, f"Expected status {status}, got {actual}: {context.tc.response.text[:300]}"


@then("the response status should be {a:d} or {b:d}")
def step_response_status_is_one_of_2(context, a: int, b: int):
    actual = context.tc.response.status_code
    assert actual in (a, b), f"Expected {a} or {b}, got {actual}"


@then("the response status should be {a:d} or {b:d} or {c:d} or {d:d}")
def step_response_status_is_one_of_4(context, a: int, b: int, c: int, d: int):
    actual = context.tc.response.status_code
    assert actual in (a, b, c, d), f"Expected one of {(a,b,c,d)}, got {actual}"


@then("the response status should be one of {codes}")
def step_response_status_in_list(context, codes: str):
    expected = tuple(int(x.strip()) for x in re.split(r"[,\s]+", codes) if x.strip())
    actual = context.tc.response.status_code
    assert actual in expected, f"Expected one of {expected}, got {actual}"


@then("the response should contain a success envelope")
def step_response_is_success_envelope(context):
    assert_success_envelope(context.tc.response)


@then('the response code should be "{code}"')
def step_response_code_is(context, code: str):
    body = context.tc.response.json() or {}
    assert body.get("code") == code, f"Expected code {code}, got {body.get('code')}: {body}"


@then("the response should be a problem-details document")
def step_response_is_problem(context):
    assert_problem_response(context.tc.response)


@then('the response should report a validation error on field "{field}"')
def step_response_field_error(context, field: str):
    fields = [e.get("field") for e in context.tc.response.field_errors]
    assert field in fields, f"Expected field error on '{field}'. Got fields: {fields}"


@then("the response should include pagination metadata")
def step_response_pagination(context):
    pag = context.tc.response.pagination or {}
    assert_keys_present(pag, ["page", "limit", "total", "hasMore"])


@then('the response Content-Type should include "{value}"')
def step_response_content_type(context, value: str):
    ct = context.tc.response.headers.get("Content-Type", "")
    assert value in ct, f"Content-Type '{ct}' does not include '{value}'"


@then('the CSV body should include the header "{header}"')
def step_csv_header(context, header: str):
    assert header in context.tc.response.text, f"CSV missing header '{header}'"


@then("the response data should be a list")
def step_response_data_is_list(context):
    assert isinstance(context.tc.response.data, list), (
        f"Expected list, got {type(context.tc.response.data).__name__}"
    )
