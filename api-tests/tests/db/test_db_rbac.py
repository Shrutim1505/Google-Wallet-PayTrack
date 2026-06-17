"""DB validation: roles & permissions consistent between DB and JWT claims."""
from __future__ import annotations

import allure
import pytest

from framework.fixtures.auth_fixtures import RegisteredUser
from framework.utils.db_helper import DBHelper
from framework.utils.jwt_helper import decode_token


@allure.epic("Database validation")
@allure.feature("RBAC consistency")
@pytest.mark.db
@pytest.mark.rbac
class TestRbacDbConsistency:

    @allure.story("JWT permissions == DB permissions for fresh user")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_user_jwt_matches_db(
        self, regular_user: RegisteredUser, db_helper: DBHelper
    ) -> None:
        db_perms = sorted(db_helper.get_user_permissions(regular_user.id))
        jwt_perms = sorted(decode_token(regular_user.token).get("permissions", []))
        assert db_perms == jwt_perms, (
            f"DB perms != JWT perms.\nDB={db_perms}\nJWT={jwt_perms}"
        )

    @allure.story("Admin role grants 14 documented permissions in DB")
    def test_admin_role_has_full_perm_set(
        self, admin_user: RegisteredUser, db_helper: DBHelper
    ) -> None:
        perms = set(db_helper.get_user_permissions(admin_user.id))
        # All seed permissions listed in the migration.
        expected = {
            "receipts:create", "receipts:read", "receipts:update", "receipts:delete",
            "receipts:read_all",
            "budgets:create", "budgets:read", "budgets:update", "budgets:delete",
            "analytics:read",
            "settings:read", "settings:update",
            "users:manage", "roles:manage",
        }
        missing = expected - perms
        assert not missing, f"Admin missing in DB: {missing}"

    @allure.story("Viewer role grants exactly the 4 read permissions")
    def test_viewer_role_minimal_perms(
        self, viewer_user: RegisteredUser, db_helper: DBHelper
    ) -> None:
        perms = set(db_helper.get_user_permissions(viewer_user.id))
        expected = {
            "receipts:read",
            "budgets:read",
            "analytics:read",
            "settings:read",
        }
        assert perms == expected, (
            f"Viewer perms drift. Expected {expected}, got {perms}"
        )
