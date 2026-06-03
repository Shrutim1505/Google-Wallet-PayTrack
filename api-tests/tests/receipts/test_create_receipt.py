"""Tests for `POST /api/receipts` (manual create)."""
from __future__ import annotations

import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.assertions import (
    assert_created,
    assert_eq,
    assert_problem_response,
    assert_schema,
    assert_status,
    assert_success_envelope,
    assert_unauthorized,
    assert_validation_error,
)
from framework.schemas import RECEIPT_SCHEMA
from framework.utils.data_generator import (
    new_receipt_payload,
    random_amount,
    random_category,
)


@allure.epic("Receipts")
@allure.feature("Create receipt")
@pytest.mark.receipts
class TestCreateReceiptHappyPath:

    @pytest.mark.smoke
    @allure.story("Authenticated user can create a receipt")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_create_receipt_returns_201(
        self, receipts_client: ReceiptsClient
    ) -> None:
        payload = new_receipt_payload()
        resp = receipts_client.create(payload)

        assert_created(resp)
        assert_success_envelope(resp)
        assert_schema(resp.data, RECEIPT_SCHEMA, name="Receipt")
        assert_eq(resp.data["merchant"], payload["merchant"], label="merchant")
        assert_eq(float(resp.data["amount"]), float(payload["amount"]), label="amount")
        assert_eq(resp.data["category"], payload["category"], label="category")

    @pytest.mark.parametrize(
        "category",
        ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"],
    )
    @allure.story("All allowed categories accepted")
    def test_create_with_each_allowed_category(
        self, receipts_client: ReceiptsClient, category: str
    ) -> None:
        resp = receipts_client.create(new_receipt_payload(category=category))
        assert_created(resp)
        assert_eq(resp.data["category"], category)

    @allure.story("Receipt with empty items list is accepted")
    def test_create_with_empty_items(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.create(new_receipt_payload(items=[]))
        assert_created(resp)
        assert resp.data["items"] == []


@allure.epic("Receipts")
@allure.feature("Create receipt")
@pytest.mark.receipts
@pytest.mark.negative
class TestCreateReceiptNegative:

    @allure.story("No auth token returns 401")
    def test_anonymous_create_returns_401(
        self, receipts_client_anon: ReceiptsClient
    ) -> None:
        resp = receipts_client_anon.create(new_receipt_payload())
        assert_unauthorized(resp)

    @allure.story("Missing merchant returns validation error")
    def test_missing_merchant(self, receipts_client: ReceiptsClient) -> None:
        payload = new_receipt_payload()
        payload.pop("merchant", None)
        resp = receipts_client.create(payload)
        # Backend may use either 400 (controller) or 422 (Joi), accept both.
        assert_status(resp, (400, 422))

    @allure.story("Negative amount returns 422")
    def test_negative_amount(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.create(new_receipt_payload(amount=-100.0))
        assert_validation_error(resp)
        assert_problem_response(resp, code="VALIDATION_ERROR")

    @allure.story("Zero amount returns 422")
    def test_zero_amount(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.create(new_receipt_payload(amount=0))
        assert_validation_error(resp)

    @allure.story("Invalid category returns 422")
    def test_invalid_category(self, receipts_client: ReceiptsClient) -> None:
        payload = new_receipt_payload()
        payload["category"] = "NotARealCategory"
        resp = receipts_client.create(payload)
        assert_validation_error(resp)

    @allure.story("Invalid date format returns 422")
    def test_invalid_date_format(self, receipts_client: ReceiptsClient) -> None:
        payload = new_receipt_payload()
        payload["date"] = "12-31-2025"  # MM-DD-YYYY, not ISO
        resp = receipts_client.create(payload)
        assert_validation_error(resp)
