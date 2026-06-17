"""
RBAC — default ``user`` role (assigned on registration).

Validates that a freshly-registered user can perform their granted
permissions and is forbidden from admin-only operations.
"""
from __future__ import annotations

import allure
import pytest

from framework.clients import AuthClient, ReceiptsClient
from framework.core.assertions import (
    assert_created,
    assert_forbidden,
    assert_ok,
)
from framework.fixtures.auth_fixtures import RegisteredUser
from framework.utils.data_generator import new_receipt_payload


EXPECTED_USER_PERMISSIONS = {
    "receipts:create",
    "receipts:read",
    "receipts:update",
    "receipts:delete",
    "budgets:create",
    "budgets:read",
    "budgets:update",
    "budgets:delete",
    "analytics:read",
    "settings:read",
    "settings:update",
}


@allure.epic("RBAC")
@allure.feature("Default user role")
@pytest.mark.rbac
class TestRbacDefaultUser:

    @pytest.mark.smoke
    @allure.story("New user has the documented set of permissions")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_default_user_permissions(
        self, regular_user: RegisteredUser
    ) -> None:
        granted = set(regular_user.permissions)
        missing = EXPECTED_USER_PERMISSIONS - granted
        assert not missing, f"Default user missing permissions: {missing}"

        # Privileged perms must NOT be present.
        forbidden_in_set = {
            "receipts:read_all",
            "users:manage",
            "roles:manage",
        } & granted
        assert not forbidden_in_set, (
            f"Default user unexpectedly has admin perms: {forbidden_in_set}"
        )

    @allure.story("User can create their own receipts")
    def test_user_can_create_receipt(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.create(new_receipt_payload())
        assert_created(resp)

    @allure.story("User can list their own receipts")
    def test_user_can_list_receipts(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.list(page=1, limit=5)
        assert_ok(resp)

    @allure.story("/auth/verify reports the correct role + permissions")
    def test_verify_reflects_user_role(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        resp = auth_client.verify(token=regular_user.token)
        assert_ok(resp)
        assert "user" in resp.data["roles"]
        assert "receipts:create" in resp.data["permissions"]
        assert "users:manage" not in resp.data["permissions"]
