"""Step definitions for auth + JWT scenarios."""
from __future__ import annotations

from behave import given, then, when  # type: ignore[attr-defined]

from framework.utils.data_generator import (
    new_user_payload,
    strong_password,
    unique_email,
)
from framework.utils.jwt_helper import (
    decode_token,
    is_valid,
    make_expired_token,
    make_wrong_signature_token,
    tamper_token,
)


# -----------------------------------------------------------------------------
#  Registration — Given
# -----------------------------------------------------------------------------


@given("a fresh registration payload")
def step_fresh_registration_payload(context):
    payload = new_user_payload()
    context.tc.scratch["register_payload"] = payload
    context.tc.cleanup_emails.append(payload["email"])


@given('a registration payload with email "{email}"')
def step_registration_with_email(context, email: str):
    payload = new_user_payload(email=email)
    context.tc.scratch["register_payload"] = payload


@given('a registration payload with email ""')
def step_registration_with_empty_email(context):
    """Parse cannot bind ``{email}`` to an empty string — separate step."""
    payload = new_user_payload(email="")
    context.tc.scratch["register_payload"] = payload


@given('a registration payload with password "{password}"')
def step_registration_with_password(context, password: str):
    payload = new_user_payload(password=password)
    context.tc.scratch["register_payload"] = payload


@given('a registration payload with password ""')
def step_registration_with_empty_password(context):
    payload = new_user_payload(password="")
    context.tc.scratch["register_payload"] = payload


@given("a registered user")
def step_registered_user(context):
    """Register a fresh user — store credentials + tokens on the context."""
    payload = new_user_payload()
    resp = context.tc.auth_client.register(**payload)
    assert resp.status_code == 201, f"Setup register failed: {resp.text}"
    data = resp.data or {}

    context.tc.user_id = data["user"]["id"]
    context.tc.user_email = data["user"]["email"]
    context.tc.user_password = payload["password"]
    context.tc.user_token = data["token"]
    context.tc.user_refresh_token = data["refreshToken"]
    context.tc.user_roles = data["user"].get("roles", [])
    context.tc.cleanup_emails.append(payload["email"])


# -----------------------------------------------------------------------------
#  Registration — When / Then
# -----------------------------------------------------------------------------


@when("the user submits the registration request")
def step_submit_registration(context):
    payload = context.tc.scratch.get("register_payload") or new_user_payload()
    context.tc.response = context.tc.auth_client.register_payload(payload)


@when("the user submits the registration request with the same email")
def step_submit_registration_same_email(context):
    payload = {
        "email": context.tc.user_email,
        "password": strong_password(),
        "name": "Duplicate Person",
    }
    context.tc.response = context.tc.auth_client.register_payload(payload)


@then('the user should be assigned the "{role}" role by default')
def step_user_has_default_role(context, role: str):
    user = (context.tc.response.data or {}).get("user", {})
    assert role in user.get("roles", []), f"Roles: {user.get('roles')}"


@then("the response should include a JWT access token")
def step_response_has_access_token(context):
    data = context.tc.response.data or {}
    token = data.get("token")
    assert token and isinstance(token, str) and len(token) > 20, "Missing/short access token"


@then("the response should include a refresh token")
def step_response_has_refresh_token(context):
    data = context.tc.response.data or {}
    token = data.get("refreshToken")
    assert token and isinstance(token, str) and len(token) > 20, "Missing/short refresh token"


# -----------------------------------------------------------------------------
#  Login
# -----------------------------------------------------------------------------


@when("the user logs in with valid credentials")
def step_login_valid(context):
    context.tc.response = context.tc.auth_client.login(
        email=context.tc.user_email, password=context.tc.user_password
    )


@when("the user logs in with an incorrect password")
def step_login_wrong_password(context):
    context.tc.response = context.tc.auth_client.login(
        email=context.tc.user_email, password="DefinitelyWrong!1"
    )


@when("the user logs in with an unknown email")
def step_login_unknown_email(context):
    context.tc.response = context.tc.auth_client.login(
        email=unique_email(prefix="ghost"), password=strong_password()
    )


@when("the user submits a login request without a password")
def step_login_no_password(context):
    context.tc.response = context.tc.auth_client.login_payload(
        {"email": context.tc.user_email}
    )


@then("the JWT should be signature-valid")
def step_jwt_signature_valid(context):
    token = (context.tc.response.data or {}).get("token")
    assert is_valid(token), "JWT failed signature verification"


@then("the JWT subject should match the registered user")
def step_jwt_sub_matches(context):
    token = (context.tc.response.data or {}).get("token")
    decoded = decode_token(token)
    assert decoded["sub"] == context.tc.user_id


# -----------------------------------------------------------------------------
#  JWT negatives
# -----------------------------------------------------------------------------


@given("a JWT that is already expired")
def step_jwt_expired(context):
    context.tc.scratch["jwt_under_test"] = make_expired_token(roles=["user"])


@given("a JWT signed with the wrong secret")
def step_jwt_wrong_secret(context):
    context.tc.scratch["jwt_under_test"] = make_wrong_signature_token(roles=["user"])


@given("a tampered version of the user's JWT")
def step_jwt_tampered(context):
    assert context.tc.user_token, "Tampering requires a registered user fixture first"
    context.tc.scratch["jwt_under_test"] = tamper_token(context.tc.user_token)


@when("the client calls the verify endpoint with that token")
def step_call_verify_with_token(context):
    token = context.tc.scratch["jwt_under_test"]
    context.tc.response = context.tc.auth_client.verify(token=token)
