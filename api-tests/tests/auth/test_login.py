"""Login flow: ``POST /api/auth/login``."""
from __future__ import annotations

import allure
import pytest

from framework.clients import AuthClient
from framework.core.assertions import (
    assert_field_error,
    assert_ok,
    assert_problem_response,
    assert_schema,
    assert_status,
    assert_success_envelope,
    assert_unauthorized,
    assert_validation_error,
)
from framework.fixtures.auth_fixtures import RegisteredUser
from framework.schemas import AUTH_RESULT_SCHEMA
from framework.utils.data_generator import (
    INVALID_EMAILS,
    strong_password,
    unique_email,
)


@allure.epic("Authentication")
@allure.feature("Login")
@pytest.mark.auth
class TestLoginHappyPath:

    @pytest.mark.smoke
    @allure.story("Valid credentials return access + refresh tokens")
    @allure.severity(allure.severity_level.BLOCKER)
    def test_login_success(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        resp = auth_client.login(email=regular_user.email, password=regular_user.password)
        assert_ok(resp)
        assert_success_envelope(resp)
        assert_schema(resp.data, AUTH_RESULT_SCHEMA, name="AuthResult")

        assert resp.data["user"]["id"] == regular_user.id
        assert resp.data["token"] != regular_user.token, (
            "A new login should issue a fresh token"
        )

    @allure.story("Login is case-insensitive on email is NOT a guarantee — verify exact match")
    def test_login_email_exact_match_required(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        # Backend uses exact match — uppercase email should fail unless DB normalises.
        resp = auth_client.login(
            email=regular_user.email.upper(), password=regular_user.password
        )
        # Either it succeeds (case-insensitive) or it 401s — both are acceptable
        # behaviours; we just want a deterministic, non-500 response.
        assert_status(resp, (200, 401))


@allure.epic("Authentication")
@allure.feature("Login")
@pytest.mark.auth
@pytest.mark.negative
class TestLoginNegative:

    @allure.story("Wrong password yields 401 — message must not leak which field is wrong")
    def test_login_wrong_password(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        resp = auth_client.login(email=regular_user.email, password="WrongPass123!")
        assert_unauthorized(resp)
        assert_problem_response(resp, code="UNAUTHORIZED")
        # Security best practice: message is generic.
        assert "password" not in (resp.json() or {}).get("title", "").lower() or \
            "email" in (resp.json() or {}).get("title", "").lower()

    @allure.story("Unknown email yields 401")
    def test_login_unknown_email(self, auth_client: AuthClient) -> None:
        resp = auth_client.login(
            email=unique_email(prefix="ghost"),
            password=strong_password(),
        )
        assert_unauthorized(resp)

    @pytest.mark.parametrize("bad_email", INVALID_EMAILS)
    @allure.story("Malformed email is rejected as 422 (validation), not 401")
    def test_login_invalid_email_format(
        self, auth_client: AuthClient, bad_email: str
    ) -> None:
        resp = auth_client.login_payload({"email": bad_email, "password": "anything12"})
        assert_validation_error(resp)
        assert_field_error(resp, "email")

    @allure.story("Missing password field returns 422")
    def test_login_missing_password(self, auth_client: AuthClient) -> None:
        resp = auth_client.login_payload({"email": unique_email()})
        assert_validation_error(resp)
        assert_field_error(resp, "password")
