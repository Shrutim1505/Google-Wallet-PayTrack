"""Common fixtures: settings, base http client, anonymous and authed sessions."""
from __future__ import annotations

from collections.abc import Iterator

import pytest

from config import Settings, get_settings
from framework.clients import AuthClient, HealthClient, ReceiptsClient
from framework.core.api_client import APIClient


# -----------------------------------------------------------------------------
#  Configuration / wiring
# -----------------------------------------------------------------------------


@pytest.fixture(scope="session")
def settings() -> Settings:
    """Cached :class:`Settings` instance for the whole test session."""
    return get_settings()


# -----------------------------------------------------------------------------
#  HTTP clients (per-test by default to avoid token bleed in parallel runs)
# -----------------------------------------------------------------------------


@pytest.fixture()
def http_client() -> Iterator[APIClient]:
    """An anonymous (no token) HTTP client."""
    client = APIClient()
    try:
        yield client
    finally:
        client.close()


@pytest.fixture()
def health_client() -> Iterator[HealthClient]:
    client = HealthClient()
    try:
        yield client
    finally:
        client.close()


@pytest.fixture()
def auth_client() -> Iterator[AuthClient]:
    """Anonymous AuthClient — register / login emit tokens for fixtures to use."""
    client = AuthClient()
    try:
        yield client
    finally:
        client.close()


@pytest.fixture()
def receipts_client_anon() -> Iterator[ReceiptsClient]:
    """ReceiptsClient with **no** auth — used to verify 401s."""
    client = ReceiptsClient()
    try:
        yield client
    finally:
        client.close()
