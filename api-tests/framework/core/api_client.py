"""
Base HTTP client used by every domain client (auth, receipts, etc).

Responsibilities
----------------
* Owns a :class:`requests.Session` with retry / pool config from settings.
* Adds default headers and bearer auth when a token is supplied.
* Logs every request / response and attaches a curl-equivalent + payload
  to the active Allure step so debugging from a report is one click.
* Raises :class:`APIRequestError` for transport problems but **never** for
  non-2xx — tests assert status explicitly.
"""
from __future__ import annotations

import json
import uuid
from typing import Any
from urllib.parse import urljoin

import allure
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import get_settings
from framework.core.exceptions import APIRequestError
from framework.core.response import APIResponse
from framework.utils.logger import get_logger

_LOG = get_logger(__name__)


class APIClient:
    """Thin, opinionated wrapper around :mod:`requests`."""

    DEFAULT_HEADERS: dict[str, str] = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "paytrack-api-tests/1.0",
    }

    # ------------------------------------------------------------ lifecycle
    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        timeout: int | None = None,
    ) -> None:
        cfg = get_settings()
        self._base_url: str = base_url or cfg.api.url
        self._timeout: int = timeout or cfg.api.timeout_seconds
        self._verify_ssl: bool = cfg.api.verify_ssl
        self._token: str | None = token

        self._session = self._build_session(cfg.api.retry)

    @staticmethod
    def _build_session(retry_cfg) -> requests.Session:
        session = requests.Session()
        retry = Retry(
            total=retry_cfg.total,
            backoff_factor=retry_cfg.backoff_factor,
            status_forcelist=retry_cfg.status_forcelist,
            allowed_methods=frozenset(["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=20)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        return session

    def close(self) -> None:
        self._session.close()

    def __enter__(self) -> "APIClient":
        return self

    def __exit__(self, *_exc: Any) -> None:
        self.close()

    # --------------------------------------------------------------- auth
    def set_token(self, token: str | None) -> "APIClient":
        """Set / clear the bearer token used on every subsequent request."""
        self._token = token
        return self

    @property
    def token(self) -> str | None:
        return self._token

    # ------------------------------------------------------------- helpers
    def _full_url(self, path: str) -> str:
        if path.startswith(("http://", "https://")):
            return path
        return urljoin(self._base_url.rstrip("/") + "/", path.lstrip("/"))

    def _build_headers(self, extra: dict[str, str] | None) -> dict[str, str]:
        headers = dict(self.DEFAULT_HEADERS)
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        # Idempotency support on POSTs that the backend opts into.
        headers.setdefault("X-Idempotency-Key", str(uuid.uuid4()))
        if extra:
            headers.update(extra)
        return headers

    @staticmethod
    def _redact(headers: dict[str, str]) -> dict[str, str]:
        cleaned = dict(headers)
        for key in ("Authorization", "Cookie", "Set-Cookie"):
            if key in cleaned:
                cleaned[key] = "***REDACTED***"
        return cleaned

    # -------------------------------------------------------- core request
    def request(
        self,
        method: str,
        path: str,
        *,
        json_body: Any = None,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        files: Any = None,
        data: Any = None,
        timeout: int | None = None,
    ) -> APIResponse:
        url = self._full_url(path)
        merged_headers = self._build_headers(headers)

        # If sending multipart, requests must set Content-Type itself.
        if files is not None:
            merged_headers.pop("Content-Type", None)

        log_payload: str = ""
        if json_body is not None:
            try:
                log_payload = json.dumps(json_body, default=str, indent=2)
            except (TypeError, ValueError):
                log_payload = str(json_body)

        _LOG.info("→ %s %s", method.upper(), url)
        if log_payload:
            _LOG.debug("  payload: %s", log_payload)

        try:
            raw = self._session.request(
                method=method.upper(),
                url=url,
                json=json_body,
                params=params,
                headers=merged_headers,
                files=files,
                data=data,
                timeout=timeout or self._timeout,
                verify=self._verify_ssl,
            )
        except requests.RequestException as exc:
            _LOG.error("Transport failure: %s", exc)
            raise APIRequestError(f"Transport failure for {method} {url}: {exc}") from exc

        response = APIResponse(raw)

        _LOG.info(
            "← %s %s [%d] in %dms",
            method.upper(), url, response.status_code, response.elapsed_ms,
        )

        # Attach to Allure for click-through debugging from the report.
        try:
            allure.attach(
                f"{method.upper()} {url}\n"
                f"Headers: {json.dumps(self._redact(merged_headers), indent=2)}\n"
                f"Params: {json.dumps(params or {}, default=str, indent=2)}\n"
                f"Body: {log_payload or '(none)'}",
                name=f"REQUEST {method.upper()} {path}",
                attachment_type=allure.attachment_type.TEXT,
            )
            allure.attach(
                f"Status: {response.status_code} ({response.elapsed_ms}ms)\n"
                f"Headers: {json.dumps(dict(raw.headers), indent=2)}\n"
                f"Body: {raw.text[:8192]}",
                name=f"RESPONSE {response.status_code}",
                attachment_type=allure.attachment_type.TEXT,
            )
        except Exception:  # pragma: no cover  -- Allure absent in some runs
            pass

        return response

    # --------------------------------------------------- HTTP method sugar
    def get(self, path: str, **kwargs: Any) -> APIResponse:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> APIResponse:
        return self.request("POST", path, **kwargs)

    def put(self, path: str, **kwargs: Any) -> APIResponse:
        return self.request("PUT", path, **kwargs)

    def patch(self, path: str, **kwargs: Any) -> APIResponse:
        return self.request("PATCH", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> APIResponse:
        return self.request("DELETE", path, **kwargs)


__all__ = ["APIClient"]
