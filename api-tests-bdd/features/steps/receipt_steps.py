"""Step definitions for receipt features (upload, search, download, RBAC)."""
from __future__ import annotations

from pathlib import Path

from behave import given, then, when  # type: ignore[attr-defined]

from framework.clients import ReceiptsClient
from framework.core.api_client import APIClient
from framework.schemas import RECEIPT_SCHEMA
from framework.utils.data_generator import new_receipt_payload, new_user_payload
from framework.utils.file_helper import (
    make_oversized_file,
    make_temp_file,
    minimal_pdf_bytes,
    tiny_png_bytes,
)


# -----------------------------------------------------------------------------
#  Authenticated user (Background)
# -----------------------------------------------------------------------------


@given("the user is authenticated")
def step_user_is_authenticated(context):
    """Register a fresh user, attach token to the receipts client."""
    payload = new_user_payload()
    resp = context.tc.auth_client.register(**payload)
    assert resp.status_code == 201, f"Auth setup failed: {resp.text}"
    data = resp.data or {}

    context.tc.user_id = data["user"]["id"]
    context.tc.user_email = data["user"]["email"]
    context.tc.user_password = payload["password"]
    context.tc.user_token = data["token"]
    context.tc.user_refresh_token = data["refreshToken"]
    context.tc.cleanup_emails.append(payload["email"])

    context.tc.receipts_client.set_token(data["token"])


# -----------------------------------------------------------------------------
#  Upload — happy path
# -----------------------------------------------------------------------------


@given("a sample PNG receipt file")
def step_sample_png(context):
    path = make_temp_file(tiny_png_bytes(), suffix=".png")
    context.tc.uploaded_file_path = path
    context.tc.cleanup_files.append(path)


@given("a sample PDF receipt file")
def step_sample_pdf(context):
    path = make_temp_file(minimal_pdf_bytes(), suffix=".pdf")
    context.tc.uploaded_file_path = path
    context.tc.cleanup_files.append(path)


@when("the user uploads the receipt")
def step_user_uploads_receipt(context):
    fp: Path = context.tc.uploaded_file_path
    context.tc.response = context.tc.receipts_client.upload(
        file_path=fp,
        filename=fp.name,
        mime_type=_mime_for(fp),
    )


@when('the user uploads the receipt with category "{category}"')
def step_user_uploads_with_category(context, category: str):
    fp: Path = context.tc.uploaded_file_path
    context.tc.response = context.tc.receipts_client.upload(
        file_path=fp,
        filename=fp.name,
        mime_type=_mime_for(fp),
        extra_form={"category": category},
    )


@then("the receipt should be persisted in the database")
def step_receipt_in_db(context):
    rid = (context.tc.response.data or {}).get("id")
    assert rid, "Response is missing receipt id"
    row = context.db_helper.find_receipt(rid)
    assert row is not None, f"Receipt {rid} not found in DB"
    assert str(row["user_id"]) == context.tc.user_id


@then('the receipt category in the response should be "{category}"')
def step_receipt_category_is(context, category: str):
    actual = (context.tc.response.data or {}).get("category")
    assert actual == category, f"Expected category {category}, got {actual}"


# -----------------------------------------------------------------------------
#  Upload — invalid
# -----------------------------------------------------------------------------


@given("an executable disguised as a receipt")
def step_disguised_exec(context):
    context.tc.scratch["bad_file"] = (
        b"MZ\x90\x00",  # PE header magic
        "evil.exe",
        "application/x-msdownload",
    )


@given("a fake receipt file of {mb:d} megabytes")
def step_oversized_file(context, mb: int):
    path = make_oversized_file(mb * 1024 * 1024, suffix=".png")
    context.tc.uploaded_file_path = path
    context.tc.cleanup_files.append(path)


@when("the user submits an upload request with no file")
def step_upload_no_file(context):
    http = APIClient(token=context.tc.user_token)
    try:
        context.tc.response = http.post("/receipts/upload", data={})
    finally:
        http.close()


# -----------------------------------------------------------------------------
#  Manual create — invalid payload
# -----------------------------------------------------------------------------


_INVALID_PAYLOAD_BUILDERS = {
    "missing merchant": lambda: {**new_receipt_payload(), "merchant": ""},
    "negative amount": lambda: new_receipt_payload(amount=-100.0),
    "zero amount": lambda: new_receipt_payload(amount=0),
    "invalid category": lambda: {**new_receipt_payload(), "category": "Garbage"},
    "malformed date": lambda: {**new_receipt_payload(), "date": "31/12/2026"},
}


@given('a manual receipt payload that is "{label}"')
def step_invalid_payload(context, label: str):
    builder = _INVALID_PAYLOAD_BUILDERS.get(label)
    assert builder, f"No builder defined for label: {label}"
    context.tc.receipt_payload = builder()


@when("the user submits the manual receipt creation request")
def step_submit_manual_create(context):
    context.tc.response = context.tc.receipts_client.create(context.tc.receipt_payload)


# -----------------------------------------------------------------------------
#  Search / list
# -----------------------------------------------------------------------------


@given("the user has 5 seeded receipts across categories")
def step_seed_receipts(context):
    seeded: list[dict] = []
    for cat in ("Food", "Transport", "Shopping", "Bills", "Entertainment"):
        resp = context.tc.receipts_client.create(new_receipt_payload(category=cat))
        assert resp.status_code == 201, f"Seed failed for {cat}: {resp.text}"
        seeded.append(resp.data)
    context.tc.scratch["seeded_receipts"] = seeded


@given("the user remembers the first seeded merchant")
def step_remember_first_merchant(context):
    seeded = context.tc.scratch.get("seeded_receipts", [])
    assert seeded, "No seeded receipts in scratch"
    context.tc.scratch["target_merchant"] = seeded[0]["merchant"]
    context.tc.scratch["target_id"] = seeded[0]["id"]


@when("the user lists receipts")
def step_list_receipts(context):
    context.tc.response = context.tc.receipts_client.list(page=1, limit=10)


@when('the user lists receipts filtered by category "{category}"')
def step_list_by_category(context, category: str):
    context.tc.response = context.tc.receipts_client.list(category=category)


@when("the user lists receipts with amount between {lo:d} and {hi:d}")
def step_list_by_amount(context, lo: int, hi: int):
    context.tc.response = context.tc.receipts_client.list(min_amount=lo, max_amount=hi)


@when("the user searches receipts using that merchant prefix")
def step_search_by_prefix(context):
    prefix = context.tc.scratch["target_merchant"][:3]
    context.tc.response = context.tc.receipts_client.list(search=prefix)


@when("the user requests merchant autocomplete using that prefix")
def step_autocomplete(context):
    prefix = context.tc.scratch["target_merchant"][:2]
    context.tc.response = context.tc.receipts_client.autocomplete(prefix)


@then("the response should contain at least {n:d} receipts")
def step_response_has_n_receipts(context, n: int):
    data = context.tc.response.data
    assert isinstance(data, list) and len(data) >= n, (
        f"Expected ≥ {n} receipts, got {len(data) if isinstance(data, list) else 'N/A'}"
    )


@then('every returned receipt should have category "{category}"')
def step_all_have_category(context, category: str):
    for r in context.tc.response.data or []:
        assert r["category"] == category, f"Stale category in response: {r}"


@then("every returned receipt amount should be between {lo:d} and {hi:d}")
def step_all_amounts_in_range(context, lo: int, hi: int):
    for r in context.tc.response.data or []:
        amt = float(r["amount"])
        assert lo <= amt <= hi, f"Amount out of range: {amt}"


@then("the seeded receipt id should be present in the results")
def step_seeded_id_present(context):
    target_id = context.tc.scratch["target_id"]
    ids = [r["id"] for r in context.tc.response.data or []]
    assert target_id in ids, f"{target_id} not in {ids}"


# -----------------------------------------------------------------------------
#  Download / get-by-id
# -----------------------------------------------------------------------------


@given("the user has at least one receipt")
def step_user_has_receipt(context):
    resp = context.tc.receipts_client.create(new_receipt_payload())
    assert resp.status_code == 201, resp.text
    context.tc.receipt_id = resp.data["id"]
    context.tc.cleanup_receipt_ids.append(resp.data["id"])


@when("the user retrieves the receipt by id")
def step_get_receipt_by_id(context):
    context.tc.response = context.tc.receipts_client.get(context.tc.receipt_id)


@when('the user retrieves a receipt with id "{rid}"')
def step_get_receipt_by_specific_id(context, rid: str):
    context.tc.response = context.tc.receipts_client.get(rid)


@when('the user exports receipts in "{fmt}" format')
def step_export(context, fmt: str):
    context.tc.response = context.tc.receipts_client.export(fmt=fmt)


@then("the response should match the receipt schema")
def step_response_matches_receipt_schema(context):
    from framework.core.assertions import assert_schema

    assert_schema(context.tc.response.data, RECEIPT_SCHEMA, name="Receipt")


@then("the receipt id in the response should match the requested id")
def step_response_id_matches(context):
    assert context.tc.response.data["id"] == context.tc.receipt_id


# -----------------------------------------------------------------------------
#  Anonymous / RBAC negatives
# -----------------------------------------------------------------------------


@given("an anonymous (unauthenticated) client")
def step_anon_client(context):
    context.tc.scratch["anon_client"] = ReceiptsClient()


@when("the client tries to create a receipt")
def step_anon_create(context):
    client: ReceiptsClient = context.tc.scratch["anon_client"]
    context.tc.response = client.create(new_receipt_payload())


@when("the client tries to list receipts")
def step_anon_list(context):
    client: ReceiptsClient = context.tc.scratch["anon_client"]
    context.tc.response = client.list()


@when("the anonymous client tries to upload the receipt")
def step_anon_upload(context):
    client: ReceiptsClient = context.tc.scratch["anon_client"]
    fp: Path = context.tc.uploaded_file_path
    context.tc.response = client.upload(
        file_path=fp, filename=fp.name, mime_type=_mime_for(fp)
    )


@given("a user with the viewer role")
def step_viewer_user(context):
    payload = new_user_payload()
    resp = context.tc.auth_client.register(**payload)
    assert resp.status_code == 201, resp.text
    user_id = resp.data["user"]["id"]
    email = resp.data["user"]["email"]

    db = context.db_helper
    db.revoke_all_default_roles(user_id)
    db.grant_role(user_id, "viewer")

    relogin = context.tc.auth_client.login(email=email, password=payload["password"])
    assert relogin.status_code == 200, relogin.text

    context.tc.user_id = user_id
    context.tc.user_email = email
    context.tc.user_password = payload["password"]
    context.tc.user_token = relogin.data["token"]
    context.tc.user_refresh_token = relogin.data["refreshToken"]
    context.tc.cleanup_emails.append(email)
    context.tc.receipts_client.set_token(relogin.data["token"])


@when("the viewer tries to create a receipt")
def step_viewer_create(context):
    context.tc.response = context.tc.receipts_client.create(new_receipt_payload())


# -----------------------------------------------------------------------------
#  Helpers
# -----------------------------------------------------------------------------


def _mime_for(path: Path) -> str:
    suf = path.suffix.lower()
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".pdf": "application/pdf",
    }.get(suf, "application/octet-stream")
