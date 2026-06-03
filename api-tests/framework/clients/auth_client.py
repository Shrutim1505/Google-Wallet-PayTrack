"""Domain client for `/auth` endpoints."""
from __future__ import annotations

from typing import Any

from framework.core.api_client import APIClient
from framework.core.response import APIResponse


class AuthClient:
    """Wraps every endpoint exposed by ``/api/auth``."""

    def __init__(self, http: APIClient | None = None) -> None:
        self._http = http or APIClient()

    # ---------------------------------------------------------------- token
    def set_token(self, token: str | None) -> "AuthClient":
        self._http.set_token(token)
        return self

    @property
    def token(self) -> str | None:
        return self._http.token

    def close(self) -> None:
        self._http.close()

    # -------------------------------------------------------------- methods
    def register(
        self,
        *,
        email: str,
        password: str,
        name: str,
        headers: dict[str, str] | None = None,
    ) -> APIResponse:
        return self._http.post(
            "/auth/register",
            json_body={"email": email, "password": password, "name": name},
            headers=headers,
        )

    def register_payload(self, payload: dict[str, Any]) -> APIResponse:
        """Register with arbitrary payload — for negative-path tests."""
        return self._http.post("/auth/register", json_body=payload)

    def login(self, *, email: str, password: str) -> APIResponse:
        return self._http.post(
            "/auth/login", json_body={"email": email, "password": password}
        )

    def login_payload(self, payload: dict[str, Any]) -> APIResponse:
        return self._http.post("/auth/login", json_body=payload)

    def verify(self, *, token: str | None = None) -> APIResponse:
        headers = {"Authorization": f"Bearer {token}"} if token else None
        return self._http.get("/auth/verify", headers=headers)

    def refresh(self, refresh_token: str) -> APIResponse:
        return self._http.post(
            "/auth/refresh", json_body={"refreshToken": refresh_token}
        )

    def logout(self, *, refresh_token: str | None = None) -> APIResponse:
        body: dict[str, Any] = {}
        if refresh_token is not None:
            body["refreshToken"] = refresh_token
        return self._http.post("/auth/logout", json_body=body or None)

    def change_password(
        self, *, current_password: str, new_password: str
    ) -> APIResponse:
        return self._http.post(
            "/auth/change-password",
            json_body={
                "currentPassword": current_password,
                "newPassword": new_password,
            },
        )

    def request_password_reset(self, email: str) -> APIResponse:
        return self._http.post(
            "/auth/password-reset/request", json_body={"email": email}
        )

    def confirm_password_reset(
        self, *, token: str, new_password: str
    ) -> APIResponse:
        return self._http.post(
            "/auth/password-reset/confirm",
            json_body={"token": token, "newPassword": new_password},
        )


__all__ = ["AuthClient"]
