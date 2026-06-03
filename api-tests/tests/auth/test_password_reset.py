"""Password-reset flow: request → confirm."""
from __future__ import annotations

import allure
import pytest

from framework.clients import AuthClient
from framework.core.assertions import (
    assert_ok,
    assert_status,
    assert_unauthorized,
)
from framework.fixtures.auth_fixtures import RegisteredUser
from framework.utils.data_generator import strong_password, unique_email


@allure.epic("Authentication")
@allure.feature("Password reset")
@pytest.mark.auth
class TestPasswordResetHappyPath:

    @allure.story("Request returns 200 even for unknown emails (anti-enumeration)")
    def test_request_unknown_email_returns_200(self, auth_client: AuthClient) -> None:
        resp = auth_client.request_password_reset(unique_email(prefix="ghost"))
        assert_ok(resp)
        # No "user not found" leakage.
        assert "exist" in (resp.message or "").lower() or resp.json().get("success") is True

    @allure.story("Dev-mode response embeds a reset token, which can be confirmed")
    def test_full_reset_cycle_in_dev_mode(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        request = auth_client.request_password_reset(regular_user.email)
        assert_ok(request)

        body = request.json() or {}
        token = body.get("_dev_token")
        if not token:
            pytest.skip("Backend not in dev-mode — `_dev_token` not exposed.")

        new_password = strong_password()
        confirm = auth_client.confirm_password_reset(
            token=token, new_password=new_password
        )
        assert_ok(confirm)

        # Old password fails, new password succeeds.
        old_login = auth_client.login(
            email=regular_user.email, password=regular_user.password
        )
        assert_unauthorized(old_login)
        new_login = auth_client.login(email=regular_user.email, password=new_password)
        assert_ok(new_login)


@allure.epic("Authentication")
@allure.feature("Password reset")
@pytest.mark.auth
@pytest.mark.negative
class TestPasswordResetNegative:

    @allure.story("Confirm with garbage token returns 4xx")
    def test_confirm_invalid_token(self, auth_client: AuthClient) -> None:
        resp = auth_client.confirm_password_reset(
            token="not-a-real-token", new_password=strong_password()
        )
        assert_status(resp, (400, 401, 422))

    @allure.story("Confirm with weak password returns 422")
    def test_confirm_weak_password(self, auth_client: AuthClient) -> None:
        resp = auth_client.confirm_password_reset(token="any", new_password="short")
        assert_status(resp, (400, 422))

    @allure.story("Request with missing email returns 400")
    def test_request_missing_email(self, auth_client: AuthClient) -> None:
        resp = auth_client._http.post("/auth/password-reset/request", json_body={})
        assert_status(resp, (400, 422))
