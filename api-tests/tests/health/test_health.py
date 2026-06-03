"""Health-endpoint smoke tests — first thing to run in any pipeline."""
from __future__ import annotations

import allure
import pytest

from framework.clients import HealthClient
from framework.core.assertions import (
    assert_keys_present,
    assert_ok,
    assert_status,
)


@allure.epic("Platform")
@allure.feature("Health")
@pytest.mark.smoke
@pytest.mark.health
class TestHealth:
    """Smoke checks against the operational endpoints."""

    @allure.story("Liveness probe")
    def test_liveness_returns_200(self, health_client: HealthClient) -> None:
        resp = health_client.live()
        assert_ok(resp)
        assert_keys_present(resp.json() or {}, ["status", "uptime", "timestamp"])
        assert resp.json()["status"] == "alive"

    @allure.story("Readiness probe")
    def test_readiness_returns_200_or_503(self, health_client: HealthClient) -> None:
        resp = health_client.ready()
        assert_status(resp, (200, 503))
        body = resp.json() or {}
        assert "checks" in body, f"Missing 'checks' in body: {body}"
        # Ensure at least the database check is reported.
        assert "database" in body["checks"], body

    @allure.story("Legacy /health")
    def test_legacy_health_returns_200(self, health_client: HealthClient) -> None:
        resp = health_client.root()
        assert_ok(resp)
        assert_keys_present(resp.json() or {}, ["status", "uptime", "timestamp"])
