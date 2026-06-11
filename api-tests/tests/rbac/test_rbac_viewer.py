"""
RBAC — ``viewer`` role (read-only).

A viewer should only be able to read receipts and budgets. Any write
operation must be rejected with 403 (FORBIDDEN), not 401 (UNAUTHORIZED) —
the request was authenticated, just not authorised.
"""
from __future__ import annotations

import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.assertions import (
    assert_forbidden,
    assert_ok,
    assert_problem_response,
)
from framework.fixtures.auth_fixtures import RegisteredUser
from framework.utils.data_generator import new_receipt_payload


@allure.epic("RBAC")
@allure.feature("Viewer role (read-only)")
@pytest.mark.rbac
class TestRbacViewer:

    @allure.story("Viewer permissions are exclusively read-prefixed")
    def test_viewer_only_has_read_perms(self, viewer_user: RegisteredUser) -> None:
        granted = set(viewer_user.permissions)
        # Allowed reads.
        assert "receipts:read" in granted
        assert "budgets:read" in granted
        # Forbidden writes.
        for write_perm in (
            "receipts:create",
            "receipts:update",
            "receipts:delete",
            "budgets:create",
        ):
            assert write_perm not in granted, (
                f"Viewer should NOT have {write_perm} but does"
            )

    @allure.story("Viewer can list receipts (200)")
    def test_viewer_can_list(self, viewer_token: str) -> None:
        client = ReceiptsClient(token=viewer_token)
        try:
            resp = client.list()
            assert_ok(resp)
        finally:
            client.close()

    @allure.story("Viewer create returns 403 with FORBIDDEN code")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_viewer_create_returns_403(self, viewer_token: str) -> None:
        client = ReceiptsClient(token=viewer_token)
        try:
            resp = client.create(new_receipt_payload())
            assert_forbidden(resp)
            assert_problem_response(resp, code="FORBIDDEN")
        finally:
            client.close()

    @allure.story("Viewer delete returns 403")
    def test_viewer_delete_returns_403(self, viewer_token: str) -> None:
        client = ReceiptsClient(token=viewer_token)
        try:
            resp = client.delete("00000000-0000-0000-0000-000000000000")
            # Permission check happens before the existence check, so 403 first.
            assert_forbidden(resp)
        finally:
            client.close()

    @allure.story("Viewer update returns 403")
    def test_viewer_update_returns_403(self, viewer_token: str) -> None:
        client = ReceiptsClient(token=viewer_token)
        try:
            resp = client.update(
                "00000000-0000-0000-0000-000000000000", {"merchant": "x"}
            )
            assert_forbidden(resp)
        finally:
            client.close()
