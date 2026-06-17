"""
Tenacity-backed retry helpers for fixture / setup operations.

Use sparingly — production code is supposed to be deterministic. These
helpers exist for waiting on the server to become reachable (CI cold-start)
and similar bootstrap scenarios, *not* for masking flaky test assertions.
"""
from __future__ import annotations

from typing import Callable, TypeVar

import requests
from tenacity import (
    RetryError,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from framework.utils.logger import get_logger

_LOG = get_logger(__name__)
T = TypeVar("T")


def wait_for_health(url: str, *, attempts: int = 30, max_wait: float = 30.0) -> None:
    """Block until the given health URL returns 2xx, or raise."""

    @retry(
        stop=stop_after_attempt(attempts),
        wait=wait_exponential(multiplier=0.3, max=max_wait),
        retry=retry_if_exception_type((requests.RequestException, AssertionError)),
        reraise=True,
    )
    def _probe() -> None:
        resp = requests.get(url, timeout=3)
        assert 200 <= resp.status_code < 300, f"health probe got {resp.status_code}"

    try:
        _probe()
        _LOG.info("Health probe succeeded for %s", url)
    except RetryError as exc:
        raise RuntimeError(f"Service at {url} did not become healthy") from exc


def with_retries(
    func: Callable[..., T],
    *,
    attempts: int = 3,
    wait_seconds: float = 0.5,
) -> Callable[..., T]:
    """Decorate ``func`` so it retries on any exception."""
    decorator = retry(
        stop=stop_after_attempt(attempts),
        wait=wait_exponential(multiplier=wait_seconds, max=5.0),
        reraise=True,
    )
    return decorator(func)  # type: ignore[return-value]


__all__ = ["wait_for_health", "with_retries"]
