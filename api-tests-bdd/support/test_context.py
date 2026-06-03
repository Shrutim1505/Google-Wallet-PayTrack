"""
Per-scenario test context.

Behave's ``context`` object is dynamic — sticking everything on it directly
makes refactors painful. This wrapper centralises the typed state we share
between Given / When / Then steps.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from framework.clients import AuthClient, HealthClient, ReceiptsClient
from framework.core.response import APIResponse


@dataclass
class TestContext:
    """Typed container for state passed between steps."""

    # Clients (instantiated in environment.before_scenario)
    auth_client: AuthClient = field(default_factory=AuthClient)
    receipts_client: ReceiptsClient = field(default_factory=ReceiptsClient)
    health_client: HealthClient = field(default_factory=HealthClient)

    # Last HTTP response (Then-steps inspect this)
    response: APIResponse | None = None

    # Authenticated user (set by Given steps)
    user_id: str | None = None
    user_email: str | None = None
    user_password: str | None = None
    user_token: str | None = None
    user_refresh_token: str | None = None
    user_roles: list[str] = field(default_factory=list)

    # Receipt under test
    receipt_id: str | None = None
    receipt_payload: dict[str, Any] | None = None
    uploaded_file_path: Path | None = None

    # Free-form scratch area for ad-hoc step values.
    scratch: dict[str, Any] = field(default_factory=dict)

    # Cleanup tracking — populated by Given steps, drained in after_scenario.
    cleanup_emails: list[str] = field(default_factory=list)
    cleanup_receipt_ids: list[str] = field(default_factory=list)
    cleanup_files: list[Path] = field(default_factory=list)

    def close(self) -> None:
        """Close every owned HTTP client."""
        for client in (self.auth_client, self.receipts_client, self.health_client):
            try:
                client.close()
            except Exception:
                pass


__all__ = ["TestContext"]
