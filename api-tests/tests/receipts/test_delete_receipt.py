"""Tests for ``DELETE /api/receipts/:id``."""
from __future__ import annotations

from typing import Any

import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.assertions import (
    assert_not_found,
    assert_ok,
    assert_unauthorized,
)
from framework.utils.data_generator import new_receipt_payload


@allure.epic("Receipts")
@allure.feature("Delete receipt")
@pytest.mark.receipts
class TestDeleteReceipt:

    @pytest.mark.smoke
    @allure.story("Delete returns 200 and subsequent GET returns 404")
    def test_delete_then_get_returns_404(
        self, receipts_client: ReceiptsClient
    ) -> None:
        # Create our own — don't use the auto-cleaning fixture.
        create = receipts_client.create(new_receipt_payload())
        rid = create.data["id"]

        delete = receipts_client.delete(rid)
        assert_ok(delete)

        get_resp = receipts_client.get(rid)
        assert_not_found(get_resp)

    @allure.story("Delete is idempotent — second delete returns 404")
    def test_delete_idempotent(self, receipts_client: ReceiptsClient) -> None:
        create = receipts_client.create(new_receipt_payload())
        rid = create.data["id"]

        first = receipts_client.delete(rid)
        assert_ok(first)

        second = receipts_client.delete(rid)
        assert_not_found(second)

    @allure.story("Anonymous delete is rejected")
    def test_anon_delete_returns_401(
        self, receipts_client_anon: ReceiptsClient, created_receipt: dict[str, Any]
    ) -> None:
        resp = receipts_client_anon.delete(created_receipt["id"])
        assert_unauthorized(resp)

    @allure.story("Delete of unknown id returns 404")
    def test_delete_unknown_id(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.delete("00000000-0000-0000-0000-000000000000")
        assert_not_found(resp)
