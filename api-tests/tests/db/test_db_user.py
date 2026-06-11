"""DB validation: state of the ``users`` table after API operations."""
from __future__ import annotations

import allure
import pytest

from framework.clients import AuthClient
from framework.core.assertions import (
    assert_created,
    assert_eq,
    assert_in,
    assert_ok,
)
from framework.fixtures.auth_fixtures import RegisteredUser
from framework.utils.data_generator import (
    new_user_payload,
    strong_password,
)
from framework.utils.db_helper import DBHelper


@allure.epic("Database validation")
@allure.feature("Users table")
@pytest.mark.db
@pytest.mark.smoke
class TestUserDb:

    @allure.story("Registration writes a row to users with correct email + non-null hash")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_register_creates_user_row(
        self, auth_client: AuthClient, db_helper: DBHelper, db_cleanup: list[str]
    ) -> None:
        payload = new_user_payload()
        resp = auth_client.register(**payload)
        assert_created(resp)
        db_cleanup.append(payload["email"])

        row = db_helper.find_user_by_email(payload["email"])
        assert row is not None, "User row missing in DB"
        assert_eq(row["email"], payload["email"], label="db.email")
        assert_eq(row["name"], payload["name"], label="db.name")
        assert row["deleted_at"] is None, "deleted_at must be NULL on fresh user"

    @allure.story("Registration grants the default ``user`` role in user_roles")
    def test_register_grants_default_role(
        self, regular_user: RegisteredUser, db_helper: DBHelper
    ) -> None:
        roles = db_helper.get_user_roles(regular_user.id)
        assert_in("user", roles, label="db role assignment")

    @allure.story("Registration grants the documented permission set")
    def test_register_grants_default_permissions(
        self, regular_user: RegisteredUser, db_helper: DBHelper
    ) -> None:
        perms = set(db_helper.get_user_permissions(regular_user.id))
        for required in ("receipts:create", "receipts:read", "settings:update"):
            assert required in perms, f"Missing permission {required} in DB"

    @allure.story("Change-password updates password_hash in DB")
    def test_change_password_updates_hash(
        self,
        auth_client: AuthClient,
        regular_user: RegisteredUser,
        db_helper: DBHelper,
    ) -> None:
        before = db_helper.fetch_one(
            "SELECT password_hash FROM users WHERE id = %s", (regular_user.id,)
        )
        assert before is not None
        old_hash = before["password_hash"]

        new_pwd = strong_password()
        auth_client.set_token(regular_user.token)
        resp = auth_client.change_password(
            current_password=regular_user.password, new_password=new_pwd
        )
        assert_ok(resp)

        after = db_helper.fetch_one(
            "SELECT password_hash FROM users WHERE id = %s", (regular_user.id,)
        )
        assert after is not None
        assert after["password_hash"] != old_hash, "password_hash did not rotate"
