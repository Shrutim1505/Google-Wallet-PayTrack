"""Tests for ``PUT /api/receipts/:id``."""
from __future__ import annotations

from typing import Any

import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.assertions import (
    assert_eq,
    assert_not_found,
    assert_ok,
    assert_status,
    assert_unauthorized,
    assert_validation_error,
)


@allure.epic("Receipts")
@allure.feature("Update receipt")
@pytest.mark.receipts
class TestUpdateReceipt:

    @pytest.mark.smoke
    @allure.story("Partial update of a single field is reflected in response")
    def test_update_merchant(
        self, receipts_client: ReceiptsClient, created_receipt: dict[str, Any]
    ) -> None:
        new_merchant = "Updated Merchant Co."
        resp = receipts_client.update(
            created_receipt["id"], {"merchant": new_merchant}
        )
        assert_ok(resp)
        assert_eq(resp.data["merchant"], new_merchant, label="merchant")

    @allure.story("Update of category is persisted")
    def test_update_category(
        self, receipts_client: ReceiptsClient, created_receipt: dict[str, Any]
    ) -> None:
        new_cat = "Bills" if created_receipt["category"] != "Bills" else "Food"
        resp = receipts_client.update(created_receipt["id"], {"category": new_cat})
        assert_ok(resp)
        assert_eq(resp.data["category"], new_cat)

        # Verify GET reflects the change.
        get_resp = receipts_client.get(created_receipt["id"])
        assert_ok(get_resp)
        assert_eq(get_resp.data["category"], new_cat)

    @allure.story("Anonymous update is rejected")
    def test_anon_update_returns_401(
        self, receipts_client_anon: ReceiptsClient, created_receipt: dict[str, Any]
    ) -> None:
        resp = receipts_client_anon.update(created_receipt["id"], {"merchant": "x"})
        assert_unauthorized(resp)

    @allure.story("Updating unknown id returns 404")
    def test_update_unknown_id(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.update(
            "00000000-0000-0000-0000-000000000000", {"merchant": "x"}
        )
        assert_not_found(resp)

    @pytest.mark.negative
    @allure.story("Negative amount in update is rejected")
    def test_update_negative_amount(
        self, receipts_client: ReceiptsClient, created_receipt: dict[str, Any]
    ) -> None:
        resp = receipts_client.update(created_receipt["id"], {"amount": -5})
        assert_validation_error(resp)

    @pytest.mark.negative
    @allure.story("Invalid category in update is rejected")
    def test_update_invalid_category(
        self, receipts_client: ReceiptsClient, created_receipt: dict[str, Any]
    ) -> None:
        resp = receipts_client.update(
            created_receipt["id"], {"category": "GarbageCategory"}
        )
        assert_validation_error(resp)
