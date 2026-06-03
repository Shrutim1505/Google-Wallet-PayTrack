"""
Fixtures that register / login users and yield ready-to-use tokens.

The framework keeps three flavours:

* ``regular_user`` — a freshly registered user with role ``user``
  (the default role assigned on registration).
* ``viewer_user`` — same as above but downgraded to role ``viewer``
  (admin DB grant).
* ``admin_user`` — same as above but upgraded to role ``admin``.

DB role tweaks require the DB-helper fixture; tests that don't need
elevated roles avoid the DB dependency entirely.
"""
from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass

import pytest

from framework.clients import AuthClient, ReceiptsClient
from framework.core.api_client import APIClient
from framework.utils.data_generator import new_user_payload
from framework.utils.db_helper import DBHelper


@dataclass
class RegisteredUser:
    """Snapshot of an account created during a test."""

    id: str
    email: str
    password: str
    name: str
    token: str
    refresh_token: str
    roles: list[str]
    permissions: list[str]


# -----------------------------------------------------------------------------
#  Helpers
# -----------------------------------------------------------------------------


def _register(auth_client: AuthClient) -> RegisteredUser:
    payload = new_user_payload()
    resp = auth_client.register(**payload)
    assert resp.status_code == 201, (
        f"Registration failed: {resp.status_code} {resp.text}"
    )
    data = resp.data or {}
    user = data.get("user", {})
    return RegisteredUser(
        id=user["id"],
        email=user["email"],
        password=payload["password"],
        name=user["name"],
        token=data["token"],
        refresh_token=data["refreshToken"],
        roles=user.get("roles", []),
        permissions=user.get("permissions", []),
    )


def _re_login(auth_client: AuthClient, email: str, password: str) -> RegisteredUser:
    """Re-issue tokens after a DB role change so the JWT carries new perms."""
    resp = auth_client.login(email=email, password=password)
    assert resp.status_code == 200, f"Re-login failed: {resp.text}"
    data = resp.data or {}
    user = data.get("user", {})
    return RegisteredUser(
        id=user["id"],
        email=user["email"],
        password=password,
        name=user["name"],
        token=data["token"],
        refresh_token=data["refreshToken"],
        roles=user.get("roles", []),
        permissions=user.get("permissions", []),
    )


# -----------------------------------------------------------------------------
#  Plain (default-role) user
# -----------------------------------------------------------------------------


@pytest.fixture()
def regular_user(auth_client: AuthClient) -> Iterator[RegisteredUser]:
    """Register a fresh user (role = ``user``) and yield credentials + tokens."""
    user = _register(auth_client)
    yield user
    # Best-effort cleanup; a DB-driven cleanup runs in db_fixtures.
    try:
        auth_client.set_token(user.token).logout(refresh_token=user.refresh_token)
    except Exception:
        pass


@pytest.fixture()
def regular_token(regular_user: RegisteredUser) -> str:
    return regular_user.token


# -----------------------------------------------------------------------------
#  Authenticated clients ready to call protected endpoints
# -----------------------------------------------------------------------------


@pytest.fixture()
def authed_http(regular_token: str) -> Iterator[APIClient]:
    client = APIClient(token=regular_token)
    try:
        yield client
    finally:
        client.close()


@pytest.fixture()
def receipts_client(regular_token: str) -> Iterator[ReceiptsClient]:
    client = ReceiptsClient(token=regular_token)
    try:
        yield client
    finally:
        client.close()


# -----------------------------------------------------------------------------
#  Privileged users (admin / viewer) — require DB
# -----------------------------------------------------------------------------


@pytest.fixture()
def admin_user(
    auth_client: AuthClient, db_helper: DBHelper
) -> Iterator[RegisteredUser]:
    """Register a user, promote them to ``admin`` via DB, re-login for new JWT."""
    user = _register(auth_client)
    db_helper.revoke_all_default_roles(user.id)
    db_helper.grant_role(user.id, "admin")
    elevated = _re_login(auth_client, user.email, user.password)
    yield elevated
    try:
        db_helper.hard_delete_user(elevated.email)
    except Exception:
        pass


@pytest.fixture()
def viewer_user(
    auth_client: AuthClient, db_helper: DBHelper
) -> Iterator[RegisteredUser]:
    """Register a user and downgrade them to ``viewer``."""
    user = _register(auth_client)
    db_helper.revoke_all_default_roles(user.id)
    db_helper.grant_role(user.id, "viewer")
    downgraded = _re_login(auth_client, user.email, user.password)
    yield downgraded
    try:
        db_helper.hard_delete_user(downgraded.email)
    except Exception:
        pass


@pytest.fixture()
def admin_token(admin_user: RegisteredUser) -> str:
    return admin_user.token


@pytest.fixture()
def viewer_token(viewer_user: RegisteredUser) -> str:
    return viewer_user.token


__all__ = [
    "RegisteredUser",
    "admin_token",
    "admin_user",
    "authed_http",
    "receipts_client",
    "regular_token",
    "regular_user",
    "viewer_token",
    "viewer_user",
]
