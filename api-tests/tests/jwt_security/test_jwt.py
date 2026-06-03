"""
JWT-focused tests.

Covers:
* Payload shape (claims required by the backend).
* Signature validation (forged / wrong-secret / unsigned tokens rejected).
* Expiry enforcement (already-expired tokens rejected).
* Token-type isolation (refresh token used as access → 401).
* Tampering (payload altered → signature mismatch → 401).
"""
from __future__ import annotations

import allure
import pytest

from framework.clients import AuthClient
from framework.core.assertions import (
    assert_keys_present,
    assert_ok,
    assert_unauthorized,
)
from framework.fixtures.auth_fixtures import RegisteredUser
from framework.utils.jwt_helper import (
    decode_token,
    is_valid,
    make_expired_token,
    make_token,
    make_wrong_signature_token,
    tamper_token,
)


@allure.epic("Security")
@allure.feature("JWT")
@pytest.mark.jwt
@pytest.mark.security
class TestJwtPayload:

    @allure.story("Issued access token is signature-valid and decodes cleanly")
    def test_issued_token_is_valid(self, regular_user: RegisteredUser) -> None:
        assert is_valid(regular_user.token), "Issued token failed signature check"
        decoded = decode_token(regular_user.token)
        assert_keys_present(decoded, ["sub", "email", "roles", "permissions", "type", "exp", "iat"])
        assert decoded["sub"] == regular_user.id
        assert decoded["email"] == regular_user.email
        assert decoded["type"] == "access"
        assert "user" in decoded["roles"]

    @allure.story("Refresh token carries `type=refresh`")
    def test_refresh_token_type(self, regular_user: RegisteredUser) -> None:
        decoded = decode_token(regular_user.refresh_token)
        assert decoded["type"] == "refresh"


@allure.epic("Security")
@allure.feature("JWT")
@pytest.mark.jwt
@pytest.mark.security
@pytest.mark.negative
class TestJwtNegative:

    @allure.story("Forged token (wrong secret) is rejected with 401")
    def test_wrong_signature_rejected(self, auth_client: AuthClient) -> None:
        bad_token = make_wrong_signature_token(
            roles=["user"], permissions=["receipts:create"]
        )
        resp = auth_client.verify(token=bad_token)
        assert_unauthorized(resp)

    @allure.story("Expired token is rejected with 401")
    def test_expired_token_rejected(self, auth_client: AuthClient) -> None:
        expired = make_expired_token(roles=["user"])
        resp = auth_client.verify(token=expired)
        assert_unauthorized(resp)

    @allure.story("Refresh token presented as access token is rejected")
    def test_refresh_token_cannot_authorize_access(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        resp = auth_client.verify(token=regular_user.refresh_token)
        assert_unauthorized(resp)

    @allure.story("Tampered payload (signature mismatch) is rejected")
    def test_tampered_token_rejected(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        tampered = tamper_token(regular_user.token)
        resp = auth_client.verify(token=tampered)
        assert_unauthorized(resp)

    @allure.story("Garbage token string is rejected")
    @pytest.mark.parametrize(
        "bad",
        [
            "",
            "not-a-jwt",
            "aaa.bbb.ccc",
            "Bearer something",
        ],
    )
    def test_malformed_token_rejected(self, auth_client: AuthClient, bad: str) -> None:
        resp = auth_client.verify(token=bad)
        assert_unauthorized(resp)

    @allure.story("Forged JWT claiming admin permissions is rejected (signature check)")
    def test_self_signed_admin_claim_rejected(self, auth_client: AuthClient) -> None:
        # We don't know the real backend secret in CI; even a token that
        # *looks* admin-y must fail signature verification.
        forged = make_wrong_signature_token(
            roles=["admin"],
            permissions=["users:manage", "roles:manage"],
            sub="00000000-0000-0000-0000-000000000001",
        )
        resp = auth_client.verify(token=forged)
        assert_unauthorized(resp)


@allure.epic("Security")
@allure.feature("JWT")
@pytest.mark.jwt
class TestJwtVerifyEndpoint:

    @allure.story("/auth/verify returns user identity for a valid token")
    def test_verify_returns_identity(
        self, auth_client: AuthClient, regular_user: RegisteredUser
    ) -> None:
        resp = auth_client.verify(token=regular_user.token)
        assert_ok(resp)
        body = resp.data
        assert body["userId"] == regular_user.id
        assert body["email"] == regular_user.email
        assert "user" in body["roles"]
        assert "receipts:create" in body["permissions"]
