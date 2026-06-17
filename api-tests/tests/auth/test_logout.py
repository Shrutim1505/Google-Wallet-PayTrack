"""Logout & change-password flows."""
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
from framework.utils.data_generator import strong_password


@allure.epic("Authentication")
@allure.feature("Logout / Change Password")
@pytest.mark.auth
class TestLogoutAndPasswordChange:

    @pytest.mark.smoke
    @allure.story("Logout revokes both access and refresh tokens")
    def test_logout_blacklists_tokens(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        auth_client.set_token(regular_user.token)
        resp = auth_client.logout(refresh_token=regular_user.refresh_token)
        assert_ok(resp)

        # Access token should now be rejected.
        verify = auth_client.verify(token=regular_user.token)
        assert_unauthorized(verify)

        # Refresh token should also be rejected.
        refresh = auth_client.refresh(regular_user.refresh_token)
        assert_unauthorized(refresh)

    @allure.story("Change password invalidates the old password")
    def test_change_password_locks_out_old_password(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        new_password = strong_password()
        auth_client.set_token(regular_user.token)

        resp = auth_client.change_password(
            current_password=regular_user.password,
            new_password=new_password,
        )
        assert_ok(resp)

        # Old password fails.
        old_login = auth_client.login(
            email=regular_user.email, password=regular_user.password
        )
        assert_unauthorized(old_login)

        # New password succeeds.
        new_login = auth_client.login(email=regular_user.email, password=new_password)
        assert_ok(new_login)

    @allure.story("Change password with wrong current password returns 401")
    def test_change_password_wrong_current(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        auth_client.set_token(regular_user.token)
        resp = auth_client.change_password(
            current_password="DefinitelyWrong!1",
            new_password=strong_password(),
        )
        assert_unauthorized(resp)

    @allure.story("Change password without auth token is rejected")
    def test_change_password_no_auth(self, auth_client: AuthClient) -> None:
        # No token set on the client.
        resp = auth_client.change_password(
            current_password="x", new_password=strong_password()
        )
        assert_unauthorized(resp)

    @allure.story("Refresh with valid token issues a new access + refresh pair")
    def test_refresh_token_rotates(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        resp = auth_client.refresh(regular_user.refresh_token)
        assert_ok(resp)
        assert resp.data["token"] != regular_user.token, "Access token must rotate"

        # Old refresh token must now be revoked (single-use rotation).
        replay = auth_client.refresh(regular_user.refresh_token)
        assert_status(replay, 401)
