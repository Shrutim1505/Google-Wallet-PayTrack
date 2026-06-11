"""User registration: ``POST /api/auth/register``."""
from __future__ import annotations

import allure
import pytest

from framework.clients import AuthClient
from framework.core.assertions import (
    assert_created,
    assert_field_error,
    assert_problem_response,
    assert_schema,
    assert_status,
    assert_success_envelope,
    assert_validation_error,
)
from framework.schemas import AUTH_RESULT_SCHEMA, PROBLEM_DETAILS_SCHEMA
from framework.utils.data_generator import (
    INVALID_EMAILS,
    WEAK_PASSWORDS,
    new_user_payload,
    strong_password,
    unique_email,
)


@allure.epic("Authentication")
@allure.feature("Registration")
@pytest.mark.auth
class TestRegistrationHappyPath:
    """Positive flows — these define the contract."""

    @pytest.mark.smoke
    @allure.story("New user is registered with default 'user' role")
    @allure.severity(allure.severity_level.BLOCKER)
    def test_register_new_user_returns_201_and_envelope(self, auth_client: AuthClient) -> None:
        payload = new_user_payload()
        resp = auth_client.register(**payload)

        assert_created(resp)
        assert_success_envelope(resp)
        assert_schema(resp.data, AUTH_RESULT_SCHEMA, name="AuthResult")

        user = resp.data["user"]
        assert user["email"] == payload["email"]
        assert user["name"] == payload["name"]
        assert "user" in user["roles"], "Default role 'user' should be granted on register"
        # User role has receipts:create at minimum.
        assert "receipts:create" in user["permissions"]

    @allure.story("Tokens issued at registration are usable immediately")
    def test_register_returns_usable_access_token(self, auth_client: AuthClient) -> None:
        resp = auth_client.register(**new_user_payload())
        assert_created(resp)

        token = resp.data["token"]
        verify = auth_client.verify(token=token)
        assert_status(verify, 200)
        assert verify.data["email"] == resp.data["user"]["email"]


@allure.epic("Authentication")
@allure.feature("Registration")
@pytest.mark.auth
@pytest.mark.negative
class TestRegistrationNegative:
    """Validation, conflict and field-error scenarios."""

    @pytest.mark.parametrize("bad_email", INVALID_EMAILS)
    @allure.story("Invalid email is rejected with 422 + field error")
    def test_invalid_email_returns_422(self, auth_client: AuthClient, bad_email: str) -> None:
        payload = new_user_payload(email=bad_email)
        resp = auth_client.register_payload(payload)
        assert_validation_error(resp)
        assert_problem_response(resp, code="VALIDATION_ERROR")
        assert_schema(resp.json(), PROBLEM_DETAILS_SCHEMA, name="ProblemDetails")
        assert_field_error(resp, "email")

    @pytest.mark.parametrize("weak_pwd", WEAK_PASSWORDS)
    @allure.story("Password shorter than 8 chars is rejected")
    def test_weak_password_returns_422(self, auth_client: AuthClient, weak_pwd: str) -> None:
        payload = new_user_payload(password=weak_pwd)
        resp = auth_client.register_payload(payload)
        assert_validation_error(resp)
        assert_field_error(resp, "password")

    @allure.story("Missing required fields — name")
    def test_missing_name_returns_422(self, auth_client: AuthClient) -> None:
        payload = {"email": unique_email(), "password": strong_password()}
        resp = auth_client.register_payload(payload)
        assert_validation_error(resp)
        assert_field_error(resp, "name")

    @allure.story("Re-registering an existing email returns 409 conflict")
    def test_duplicate_email_returns_409(self, auth_client: AuthClient) -> None:
        payload = new_user_payload()
        first = auth_client.register(**payload)
        assert_created(first)

        second = auth_client.register(**payload)
        assert_status(second, 409)
        assert_problem_response(second, code="CONFLICT")
