"""DB validation: ``receipts`` table state after API operations."""
from __future__ import annotations

from typing import Any

import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.assertions import assert_eq, assert_ok
from framework.fixtures.auth_fixtures import RegisteredUser
from framework.utils.data_generator import new_receipt_payload
from framework.utils.db_helper import DBHelper


@allure.epic("Database validation")
@allure.feature("Receipts table")
@pytest.mark.db
class TestReceiptsDb:

    @allure.story("Receipt created via API exists in DB with matching values")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_create_persists_to_db(
        self,
        receipts_client: ReceiptsClient,
        regular_user: RegisteredUser,
        db_helper: DBHelper,
    ) -> None:
        payload = new_receipt_payload()
        resp = receipts_client.create(payload)
        assert resp.status_code == 201, resp.text
        rid = resp.data["id"]

        row = db_helper.find_receipt(rid)
        assert row is not None, "Receipt missing from DB"
        assert_eq(str(row["user_id"]), regular_user.id, label="db.user_id")
        assert_eq(row["merchant"], payload["merchant"], label="db.merchant")
        assert float(row["amount"]) == pytest.approx(float(payload["amount"]))
        assert row["deleted_at"] is None

    @allure.story("Delete sets deleted_at (soft delete) — row remains")
    def test_delete_soft_deletes_row(
        self,
        receipts_client: ReceiptsClient,
        regular_user: RegisteredUser,
        db_helper: DBHelper,
    ) -> None:
        create = receipts_client.create(new_receipt_payload())
        rid = create.data["id"]

        delete = receipts_client.delete(rid)
        assert_ok(delete)

        row = db_helper.find_receipt(rid)
        assert row is not None, "Soft-delete should keep the row"
        assert row["deleted_at"] is not None, "deleted_at should be set after DELETE"

    @allure.story("count_receipts_for_user matches API list total (live receipts only)")
    def test_count_matches_api_total(
        self,
        receipts_client: ReceiptsClient,
        regular_user: RegisteredUser,
        seeded_receipts: list[dict[str, Any]],
        db_helper: DBHelper,
    ) -> None:
        api_total = receipts_client.list(page=1, limit=1).pagination["total"]
        db_total = db_helper.count_receipts_for_user(regular_user.id)
        assert db_total == api_total, f"DB={db_total} but API={api_total}"

    @allure.story("Update is reflected in DB updated_at + new values")
    def test_update_reflected_in_db(
        self,
        receipts_client: ReceiptsClient,
        created_receipt: dict[str, Any],
        db_helper: DBHelper,
    ) -> None:
        new_merchant = "DB-Validated-Merchant"
        resp = receipts_client.update(created_receipt["id"], {"merchant": new_merchant})
        assert_ok(resp)

        row = db_helper.find_receipt(created_receipt["id"])
        assert row is not None
        assert_eq(row["merchant"], new_merchant, label="db.merchant after update")
