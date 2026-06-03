"""
End-to-end user journey.

This single test exercises the full lifecycle a real user would go through,
which is the strongest signal that the integration between auth, RBAC,
receipts and DB is healthy.
"""
from __future__ import annotations

import allure
import pytest

from framework.clients import AuthClient, ReceiptsClient
from framework.core.assertions import (
    assert_created,
    assert_in,
    assert_not_found,
    assert_ok,
)
from framework.utils.data_generator import (
    new_receipt_payload,
    new_user_payload,
)
from framework.utils.db_helper import DBHelper


@allure.epic("End-to-end")
@allure.feature("User journey")
@pytest.mark.e2e
@pytest.mark.smoke
class TestUserJourney:

    @allure.story("Register → login → upload receipt → list → update → delete → DB-verify")
    @allure.severity(allure.severity_level.BLOCKER)
    def test_full_user_journey(
        self,
        auth_client: AuthClient,
        db_helper: DBHelper,
        db_cleanup: list[str],
    ) -> None:
        # 1. Register
        with allure.step("Register a new user"):
            payload = new_user_payload()
            register = auth_client.register(**payload)
            assert_created(register)
            db_cleanup.append(payload["email"])
            user_id = register.data["user"]["id"]

        # 2. Login
        with allure.step("Login with the new credentials"):
            login = auth_client.login(
                email=payload["email"], password=payload["password"]
            )
            assert_ok(login)
            access_token = login.data["token"]

        # 3. Create receipt
        receipts = ReceiptsClient(token=access_token)
        try:
            with allure.step("Create a receipt"):
                receipt_payload = new_receipt_payload(category="Food")
                created = receipts.create(receipt_payload)
                assert_created(created)
                rid = created.data["id"]

            # 4. List receipts
            with allure.step("List receipts — new one is present"):
                listing = receipts.list(page=1, limit=10)
                assert_ok(listing)
                ids = [r["id"] for r in listing.data]
                assert_in(rid, ids, label="created receipt id")

            # 5. Update merchant
            with allure.step("Update merchant"):
                update = receipts.update(rid, {"merchant": "E2E Updated Merchant"})
                assert_ok(update)
                assert update.data["merchant"] == "E2E Updated Merchant"

            # 6. Validate in DB
            with allure.step("Validate updated receipt in DB"):
                row = db_helper.find_receipt(rid)
                assert row is not None
                assert row["merchant"] == "E2E Updated Merchant"
                assert str(row["user_id"]) == user_id

            # 7. Delete
            with allure.step("Delete and confirm 404 on subsequent GET"):
                delete = receipts.delete(rid)
                assert_ok(delete)
                gone = receipts.get(rid)
                assert_not_found(gone)
        finally:
            receipts.close()

        # 8. Logout invalidates token
        with allure.step("Logout invalidates the access token"):
            auth_client.set_token(access_token)
            auth_client.logout(refresh_token=login.data["refreshToken"])
            verify = auth_client.verify(token=access_token)
            assert verify.status_code == 401
