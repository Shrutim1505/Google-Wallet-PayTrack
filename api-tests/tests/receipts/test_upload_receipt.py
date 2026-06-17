"""Tests for ``POST /api/receipts/upload`` (multipart file upload)."""
from __future__ import annotations

import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.assertions import (
    assert_created,
    assert_problem_response,
    assert_schema,
    assert_status,
    assert_success_envelope,
    assert_unauthorized,
)
from framework.schemas import RECEIPT_SCHEMA
from framework.utils.file_helper import (
    make_oversized_file,
    minimal_pdf_bytes,
    tiny_png_bytes,
)


@allure.epic("Receipts")
@allure.feature("Upload receipt (OCR)")
@pytest.mark.receipts
class TestUploadReceiptHappyPath:

    @pytest.mark.smoke
    @allure.story("Upload PNG returns 201 + parsed receipt envelope")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_upload_png(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.upload(
            file_bytes=tiny_png_bytes(), filename="ocr.png", mime_type="image/png"
        )
        assert_created(resp)
        assert_success_envelope(resp)
        assert_schema(resp.data, RECEIPT_SCHEMA, name="Receipt")
        # Backend OCR mock will fill in placeholder fields — just confirm shape.
        assert resp.data["amount"] >= 0

    @allure.story("Upload PDF is accepted")
    def test_upload_pdf(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.upload(
            file_bytes=minimal_pdf_bytes(),
            filename="bill.pdf",
            mime_type="application/pdf",
        )
        assert_created(resp)

    @allure.story("Upload with explicit category override is honoured")
    def test_upload_with_category_override(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.upload(
            file_bytes=tiny_png_bytes(),
            extra_form={"category": "Bills"},
        )
        assert_created(resp)
        assert resp.data["category"] == "Bills"


@allure.epic("Receipts")
@allure.feature("Upload receipt (OCR)")
@pytest.mark.receipts
@pytest.mark.negative
class TestUploadReceiptNegative:

    @allure.story("Anonymous upload returns 401")
    def test_anon_upload(self, receipts_client_anon: ReceiptsClient) -> None:
        resp = receipts_client_anon.upload(
            file_bytes=tiny_png_bytes(), filename="x.png"
        )
        assert_unauthorized(resp)

    @allure.story("Disallowed mime type is rejected")
    def test_disallowed_mime_type(self, receipts_client: ReceiptsClient) -> None:
        # Plain text — not in ALLOWED_FILE_TYPES list.
        resp = receipts_client.upload(
            file_bytes=b"hello world",
            filename="evil.exe",
            mime_type="application/x-msdownload",
        )
        # Multer rejects with 4xx (commonly 500 from middleware in dev — accept range).
        assert_status(resp, (400, 415, 422, 500))

    @allure.story("Missing file part returns 400")
    def test_missing_file_part(self, receipts_client: ReceiptsClient) -> None:
        # Use raw http to skip the auto-file injection.
        from framework.core.api_client import APIClient

        http = APIClient(token=receipts_client._http.token)
        resp = http.post("/receipts/upload", data={"category": "Food"})
        assert_status(resp, (400, 422))
        http.close()

    @pytest.mark.slow
    @allure.story("File above MAX_FILE_SIZE is rejected")
    def test_oversized_file_rejected(self, receipts_client: ReceiptsClient) -> None:
        big = make_oversized_file(11 * 1024 * 1024)  # 11 MB > 10 MB default cap
        try:
            with big.open("rb") as fh:
                resp = receipts_client.upload(
                    file_bytes=fh.read(), filename="big.png"
                )
            assert_status(resp, (400, 413, 422, 500))
        finally:
            big.unlink(missing_ok=True)
