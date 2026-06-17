"""Wrapper for `/health/*` endpoints — used by smoke / readiness tests."""
from __future__ import annotations

from urllib.parse import urljoin

from config import get_settings
from framework.core.api_client import APIClient
from framework.core.response import APIResponse


class HealthClient:
    """Health endpoints live outside the ``/api`` prefix."""

    def __init__(self) -> None:
        cfg = get_settings()
        self._client = APIClient(base_url=cfg.api.base_url)

    def live(self) -> APIResponse:
        return self._client.get("/health/live")

    def ready(self) -> APIResponse:
        return self._client.get("/health/ready")

    def root(self) -> APIResponse:
        return self._client.get("/health")

    def close(self) -> None:
        self._client.close()


__all__ = ["HealthClient"]
