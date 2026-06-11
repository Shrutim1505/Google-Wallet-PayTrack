"""Fixtures that pre-create receipts so retrieval / update / delete tests focus on behaviour."""
from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import pytest

from framework.clients import ReceiptsClient
from framework.utils.data_generator import new_receipt_payload


@pytest.fixture()
def sample_receipt_payload() -> dict[str, Any]:
    """A valid receipt payload — fresh per call to keep tests isolated."""
    return new_receipt_payload()


@pytest.fixture()
def created_receipt(receipts_client: ReceiptsClient) -> Iterator[dict[str, Any]]:
    """Create a receipt for a regular user and yield the response data dict."""
    payload = new_receipt_payload()
    resp = receipts_client.create(payload)
    assert resp.status_code == 201, f"Setup failed: {resp.text}"
    receipt = resp.data
    yield receipt
    # Best-effort cleanup — ignore if test already deleted it.
    try:
        receipts_client.delete(receipt["id"])
    except Exception:
        pass


@pytest.fixture()
def seeded_receipts(receipts_client: ReceiptsClient) -> Iterator[list[dict[str, Any]]]:
    """Seed five receipts spanning all categories — useful for filter tests."""
    seeded: list[dict[str, Any]] = []
    for category in ("Food", "Transport", "Shopping", "Bills", "Entertainment"):
        payload = new_receipt_payload(category=category)
        resp = receipts_client.create(payload)
        assert resp.status_code == 201, f"Seed failed for {category}: {resp.text}"
        seeded.append(resp.data)
    yield seeded
    for r in seeded:
        try:
            receipts_client.delete(r["id"])
        except Exception:
            pass


__all__ = ["created_receipt", "sample_receipt_payload", "seeded_receipts"]
