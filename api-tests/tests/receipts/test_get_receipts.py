"""Tests for receipt retrieval: list, paginate, filter, autocomplete, export, get-by-id."""
from __future__ import annotations

from typing import Any

import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.assertions import (
    assert_keys_present,
    assert_not_found,
    assert_ok,
    assert_schema,
    assert_status,
    assert_success_envelope,
    assert_unauthorized,
)
from framework.schemas import RECEIPT_LIST_RESPONSE_SCHEMA, RECEIPT_SCHEMA


@allure.epic("Receipts")
@allure.feature("List + filter")
@pytest.mark.receipts
class TestListReceipts:

    @pytest.mark.smoke
    @allure.story("List endpoint returns paginated envelope")
    def test_list_returns_pagination(
        self, receipts_client: ReceiptsClient, seeded_receipts: list[dict[str, Any]]
    ) -> None:
        resp = receipts_client.list(page=1, limit=10)
        assert_ok(resp)
        assert_success_envelope(resp)
        assert_schema(resp.json(), RECEIPT_LIST_RESPONSE_SCHEMA, name="ReceiptList")
        assert_keys_present(resp.pagination or {}, ["page", "limit", "total", "hasMore"])
        assert resp.pagination["total"] >= len(seeded_receipts)

    @allure.story("Pagination — page 2 with limit 1 returns ≤ 1 element")
    def test_pagination_limit(
        self, receipts_client: ReceiptsClient, seeded_receipts: list[dict[str, Any]]
    ) -> None:
        resp = receipts_client.list(page=2, limit=1)
        assert_ok(resp)
        assert len(resp.data) <= 1

    @allure.story("Filter by category returns only that category")
    def test_filter_by_category(
        self, receipts_client: ReceiptsClient, seeded_receipts: list[dict[str, Any]]
    ) -> None:
        resp = receipts_client.list(category="Food")
        assert_ok(resp)
        for r in resp.data:
            assert r["category"] == "Food", f"Stale category: {r}"

    @allure.story("Filter by amount range")
    def test_filter_by_amount_range(
        self, receipts_client: ReceiptsClient, seeded_receipts: list[dict[str, Any]]
    ) -> None:
        resp = receipts_client.list(min_amount=0.01, max_amount=10_000.0)
        assert_ok(resp)
        for r in resp.data:
            assert 0.01 <= float(r["amount"]) <= 10_000.0

    @allure.story("Filter by search returns only matching merchants")
    def test_filter_by_search(
        self, receipts_client: ReceiptsClient, seeded_receipts: list[dict[str, Any]]
    ) -> None:
        target = seeded_receipts[0]["merchant"]
        resp = receipts_client.list(search=target[:3])
        assert_ok(resp)
        # At least the seed should be in the result.
        ids = [r["id"] for r in resp.data]
        assert seeded_receipts[0]["id"] in ids

    @allure.story("List rejects requests without auth token")
    def test_anon_list_returns_401(self, receipts_client_anon: ReceiptsClient) -> None:
        resp = receipts_client_anon.list()
        assert_unauthorized(resp)


@allure.epic("Receipts")
@allure.feature("Get by ID")
@pytest.mark.receipts
class TestGetReceipt:

    @allure.story("Get by ID returns the same receipt that was created")
    def test_get_by_id(
        self, receipts_client: ReceiptsClient, created_receipt: dict[str, Any]
    ) -> None:
        resp = receipts_client.get(created_receipt["id"])
        assert_ok(resp)
        assert_schema(resp.data, RECEIPT_SCHEMA)
        assert resp.data["id"] == created_receipt["id"]

    @allure.story("Unknown receipt id returns 404")
    def test_get_unknown_id(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.get("00000000-0000-0000-0000-000000000000")
        assert_not_found(resp)


@allure.epic("Receipts")
@allure.feature("Autocomplete")
@pytest.mark.receipts
class TestAutocomplete:

    @allure.story("Autocomplete returns suggestions for matching prefix")
    def test_autocomplete_prefix(
        self, receipts_client: ReceiptsClient, seeded_receipts: list[dict[str, Any]]
    ) -> None:
        prefix = seeded_receipts[0]["merchant"][:2]
        resp = receipts_client.autocomplete(prefix)
        assert_ok(resp)
        assert isinstance(resp.data, list)

    @allure.story("Empty query returns empty list (200)")
    def test_autocomplete_empty(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.autocomplete("")
        assert_ok(resp)
        assert resp.data == []


@allure.epic("Receipts")
@allure.feature("Export")
@pytest.mark.receipts
class TestExport:

    @allure.story("Export json returns success envelope")
    def test_export_json(
        self, receipts_client: ReceiptsClient, seeded_receipts: list[dict[str, Any]]
    ) -> None:
        resp = receipts_client.export(fmt="json")
        assert_ok(resp)
        body = resp.json()
        assert isinstance(body, dict) and body.get("success") is True

    @allure.story("Export csv returns text/csv content type")
    def test_export_csv(
        self, receipts_client: ReceiptsClient, seeded_receipts: list[dict[str, Any]]
    ) -> None:
        resp = receipts_client.export(fmt="csv")
        assert_ok(resp)
        assert "text/csv" in resp.headers.get("Content-Type", "")
        assert "id,merchant,amount" in resp.text
