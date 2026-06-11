"""
RBAC — ``admin`` role.

Tests that a user explicitly granted the admin role gains the additional
permissions documented in the migration (``receipts:read_all``, ``users:manage``,
``roles:manage``) without losing any standard-user permissions.
"""
from __future__ import annotations

import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.api_client import APIClient
from framework.core.assertions import (
    assert_created,
    assert_ok,
)
from framework.fixtures.auth_fixtures import RegisteredUser
from framework.utils.data_generator import new_receipt_payload


@allure.epic("RBAC")
@allure.feature("Admin role")
@pytest.mark.rbac
class TestRbacAdmin:

    @allure.story("Admin token carries admin permissions")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_admin_permissions_present(self, admin_user: RegisteredUser) -> None:
        granted = set(admin_user.permissions)
        required = {
            "receipts:read_all",
            "users:manage",
            "roles:manage",
            "receipts:create",
            "receipts:delete",
        }
        missing = required - granted
        assert not missing, f"Admin missing perms: {missing}"

    @allure.story("Admin can create receipts (inherits write perms)")
    def test_admin_can_create_receipt(self, admin_token: str) -> None:
        client = ReceiptsClient(token=admin_token)
        try:
            resp = client.create(new_receipt_payload())
            assert_created(resp)
        finally:
            client.close()

    @allure.story("Admin can list receipts")
    def test_admin_can_list(self, admin_token: str) -> None:
        client = ReceiptsClient(token=admin_token)
        try:
            resp = client.list(page=1, limit=5)
            assert_ok(resp)
        finally:
            client.close()
