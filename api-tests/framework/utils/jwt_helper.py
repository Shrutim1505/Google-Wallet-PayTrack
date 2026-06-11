"""
JWT helpers used both by tests (decode payload, build forged tokens) and
by negative-path suites validating that the backend rejects malformed,
expired or wrongly-signed tokens.
"""
from __future__ import annotations

import time
from typing import Any

import jwt
from jwt import InvalidTokenError

from config import get_settings


# -----------------------------------------------------------------------------
#  Decoding
# -----------------------------------------------------------------------------


def decode_token(token: str, *, verify: bool = True) -> dict[str, Any]:
    """Decode a JWT. With ``verify=False`` skip signature checks (debug only)."""
    secret = get_settings().auth.jwt_secret
    if not verify:
        return jwt.decode(token, options={"verify_signature": False})
    return jwt.decode(token, secret, algorithms=["HS256"])


def is_valid(token: str) -> bool:
    try:
        decode_token(token, verify=True)
        return True
    except InvalidTokenError:
        return False


# -----------------------------------------------------------------------------
#  Encoding (used to forge tokens for negative tests)
# -----------------------------------------------------------------------------


def _now() -> int:
    return int(time.time())


def make_token(
    *,
    sub: str = "00000000-0000-0000-0000-000000000000",
    email: str = "qa@paytrack-test.dev",
    roles: list[str] | None = None,
    permissions: list[str] | None = None,
    token_type: str = "access",
    expires_in: int | None = None,
    issued_at: int | None = None,
    secret: str | None = None,
    algorithm: str = "HS256",
    extra: dict[str, Any] | None = None,
) -> str:
    """
    Forge a JWT mirroring the backend's payload shape.

    Use ``secret=<wrong>`` to test signature validation, ``expires_in=-60``
    for already-expired tokens, etc.
    """
    cfg = get_settings()
    iat = issued_at if issued_at is not None else _now()
    exp_seconds = (
        cfg.auth.jwt_access_expiry_seconds
        if expires_in is None
        else expires_in
    )

    payload: dict[str, Any] = {
        "sub": sub,
        "email": email,
        "roles": roles or [],
        "permissions": permissions or [],
        "type": token_type,
        "iat": iat,
        "exp": iat + exp_seconds,
    }
    if extra:
        payload.update(extra)

    return jwt.encode(payload, secret or cfg.auth.jwt_secret, algorithm=algorithm)


def make_expired_token(**kwargs: Any) -> str:
    """Return a token whose ``exp`` is already in the past."""
    return make_token(expires_in=-60, **kwargs)


def make_wrong_signature_token(**kwargs: Any) -> str:
    """Return a token signed with the wrong secret."""
    return make_token(secret="definitely-not-the-real-secret-XYZ", **kwargs)


def make_unsigned_token(**kwargs: Any) -> str:
    """Return an ``alg=none`` token — backend should reject it."""
    return make_token(algorithm="none", secret="", **kwargs)


def tamper_token(token: str) -> str:
    """
    Return a syntactically valid JWT whose payload section has been edited,
    invalidating the signature.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    header, payload, signature = parts
    # Flip a few bytes in the payload — base64 chars only, keeps shape valid.
    swap = {"a": "b", "b": "a"}
    mutated = "".join(swap.get(c, c) for c in payload[:5]) + payload[5:]
    return f"{header}.{mutated}.{signature}"


__all__ = [
    "decode_token",
    "is_valid",
    "make_expired_token",
    "make_token",
    "make_unsigned_token",
    "make_wrong_signature_token",
    "tamper_token",
]
