"""
Light-weight wrapper around :class:`requests.Response`.

Adds:
* Eagerly parsed JSON (with safe fallback to ``None``).
* Convenience accessors for the PayTrack response envelope:
  ``{ "success": bool, "data": ..., "message": ..., "pagination": ... }``.
* Convenience accessors for RFC 7807 problem responses.
"""
from __future__ import annotations

from typing import Any

import requests


class APIResponse:
    """Test-facing wrapper that never raises on `.json()`."""

    __slots__ = ("_raw", "_json", "elapsed_ms")

    def __init__(self, raw: requests.Response) -> None:
        self._raw = raw
        self.elapsed_ms = int(raw.elapsed.total_seconds() * 1000) if raw.elapsed else 0
        try:
            self._json: Any = raw.json() if raw.content else None
        except ValueError:
            self._json = None

    # ------------------------------------------------------------------ raw
    @property
    def raw(self) -> requests.Response:
        return self._raw

    @property
    def status_code(self) -> int:
        return self._raw.status_code

    @property
    def headers(self) -> dict[str, str]:
        return dict(self._raw.headers)

    @property
    def text(self) -> str:
        return self._raw.text

    @property
    def url(self) -> str:
        return self._raw.url

    @property
    def request_method(self) -> str:
        return self._raw.request.method if self._raw.request else "?"

    # ----------------------------------------------------------------- json
    def json(self) -> Any:
        return self._json

    # ----------------------------------------------- success / data envelope
    @property
    def is_success_envelope(self) -> bool:
        return isinstance(self._json, dict) and bool(self._json.get("success"))

    @property
    def data(self) -> Any:
        """Returns the ``data`` field of the success envelope, or ``None``."""
        return self._json.get("data") if isinstance(self._json, dict) else None

    @property
    def message(self) -> str | None:
        return self._json.get("message") if isinstance(self._json, dict) else None

    @property
    def pagination(self) -> dict[str, Any] | None:
        return self._json.get("pagination") if isinstance(self._json, dict) else None

    # --------------------------------------------- RFC 7807 problem details
    @property
    def is_problem(self) -> bool:
        ct = self._raw.headers.get("Content-Type", "")
        return "application/problem+json" in ct or (
            isinstance(self._json, dict)
            and {"type", "title", "status"}.issubset(self._json.keys())
        )

    @property
    def error_code(self) -> str | None:
        return self._json.get("code") if isinstance(self._json, dict) else None

    @property
    def trace_id(self) -> str | None:
        return self._json.get("traceId") if isinstance(self._json, dict) else None

    @property
    def field_errors(self) -> list[dict[str, str]]:
        if isinstance(self._json, dict) and isinstance(self._json.get("errors"), list):
            return self._json["errors"]
        return []

    # ---------------------------------------------------------------- repr
    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<APIResponse {self.request_method} {self.url} "
            f"-> {self.status_code} ({self.elapsed_ms}ms)>"
        )


__all__ = ["APIResponse"]
