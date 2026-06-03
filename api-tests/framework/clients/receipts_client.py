"""Domain client for `/receipts` endpoints."""
from __future__ import annotations

import io
from pathlib import Path
from typing import Any, BinaryIO

from framework.core.api_client import APIClient
from framework.core.response import APIResponse


class ReceiptsClient:
    """Wraps every endpoint under ``/api/receipts``."""

    def __init__(self, http: APIClient | None = None, *, token: str | None = None) -> None:
        self._http = http or APIClient(token=token)

    def set_token(self, token: str | None) -> "ReceiptsClient":
        self._http.set_token(token)
        return self

    def close(self) -> None:
        self._http.close()

    # ------------------------------------------------------------- create
    def create(self, payload: dict[str, Any]) -> APIResponse:
        return self._http.post("/receipts", json_body=payload)

    # ------------------------------------------------------------- upload
    def upload(
        self,
        file_path: str | Path | None = None,
        *,
        file_bytes: bytes | None = None,
        filename: str = "receipt.png",
        mime_type: str = "image/png",
        extra_form: dict[str, str] | None = None,
    ) -> APIResponse:
        """
        Upload a receipt file. Provide either ``file_path`` or ``file_bytes``.

        ``extra_form`` lets you include free-form fields (e.g. ``category``).
        """
        if file_path is None and file_bytes is None:
            raise ValueError("Provide either file_path or file_bytes")

        fp: BinaryIO
        if file_bytes is not None:
            fp = io.BytesIO(file_bytes)
        else:
            fp = open(str(file_path), "rb")

        try:
            files = {"file": (filename, fp, mime_type)}
            return self._http.post(
                "/receipts/upload",
                files=files,
                data=extra_form or {},
            )
        finally:
            try:
                fp.close()
            except Exception:
                pass

    # ----------------------------------------------------------------- list
    def list(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
        category: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        min_amount: float | None = None,
        max_amount: float | None = None,
        search: str | None = None,
    ) -> APIResponse:
        params: dict[str, Any] = {}
        if page is not None:
            params["page"] = page
        if limit is not None:
            params["limit"] = limit
        if category:
            params["category"] = category
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if min_amount is not None:
            params["minAmount"] = min_amount
        if max_amount is not None:
            params["maxAmount"] = max_amount
        if search:
            params["search"] = search
        return self._http.get("/receipts", params=params)

    # --------------------------------------------------------------- by id
    def get(self, receipt_id: str) -> APIResponse:
        return self._http.get(f"/receipts/{receipt_id}")

    def update(self, receipt_id: str, payload: dict[str, Any]) -> APIResponse:
        return self._http.put(f"/receipts/{receipt_id}", json_body=payload)

    def delete(self, receipt_id: str) -> APIResponse:
        return self._http.delete(f"/receipts/{receipt_id}")

    # ---------------------------------------------------- helper endpoints
    def autocomplete(self, query: str, *, limit: int | None = None) -> APIResponse:
        params: dict[str, Any] = {"q": query}
        if limit is not None:
            params["limit"] = limit
        return self._http.get("/receipts/autocomplete", params=params)

    def export(self, *, fmt: str = "json") -> APIResponse:
        return self._http.get("/receipts/export", params={"format": fmt})


__all__ = ["ReceiptsClient"]
