"""
Lightweight Postgres helper for state-validation tests.

Design notes
------------
* One connection per fixture call — short-lived, autocommit-on-read.
* Returns plain dicts (RealDictCursor) so tests don't depend on psycopg2 types.
* All write helpers (`grant_role`, `revoke_role`, …) are explicitly transactional.
* The framework never connects unless a DB-tagged test asks for it, so non-DB
  test runs don't require a Postgres instance.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import RealDictCursor

from config import get_settings
from framework.core.exceptions import DatabaseError
from framework.utils.logger import get_logger

_LOG = get_logger(__name__)


class DBHelper:
    """Convenience wrapper around psycopg2 for assertion-style queries."""

    def __init__(self) -> None:
        self._cfg = get_settings().database

    # -------------------------------------------------- connection plumbing
    @contextmanager
    def connection(self) -> Iterator[psycopg2.extensions.connection]:
        try:
            conn = psycopg2.connect(
                host=self._cfg.host,
                port=self._cfg.port,
                dbname=self._cfg.name,
                user=self._cfg.user,
                password=self._cfg.password,
                connect_timeout=5,
            )
        except psycopg2.Error as exc:
            raise DatabaseError(f"Cannot connect to {self._cfg.dsn}: {exc}") from exc
        try:
            yield conn
        finally:
            conn.close()

    def fetch_one(self, sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def fetch_all(self, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> int:
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            return cur.rowcount

    # ------------------------------------------------- domain query helpers
    # ----- Users -----
    def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        return self.fetch_one(
            "SELECT id, email, name, email_verified, deleted_at, created_at "
            "FROM users WHERE email = %s",
            (email,),
        )

    def get_user_roles(self, user_id: str) -> list[str]:
        rows = self.fetch_all(
            "SELECT r.name FROM roles r "
            "JOIN user_roles ur ON ur.role_id = r.id "
            "WHERE ur.user_id = %s",
            (user_id,),
        )
        return [r["name"] for r in rows]

    def get_user_permissions(self, user_id: str) -> list[str]:
        rows = self.fetch_all(
            "SELECT DISTINCT p.name FROM permissions p "
            "JOIN role_permissions rp ON rp.permission_id = p.id "
            "JOIN user_roles ur ON ur.role_id = rp.role_id "
            "WHERE ur.user_id = %s",
            (user_id,),
        )
        return [r["name"] for r in rows]

    # ----- Receipts -----
    def find_receipt(self, receipt_id: str) -> dict[str, Any] | None:
        return self.fetch_one(
            "SELECT id, user_id, merchant, amount, currency, date, category, "
            "       items, notes, deleted_at, created_at, updated_at "
            "FROM receipts WHERE id = %s",
            (receipt_id,),
        )

    def count_receipts_for_user(self, user_id: str) -> int:
        row = self.fetch_one(
            "SELECT COUNT(*)::int AS n FROM receipts "
            "WHERE user_id = %s AND deleted_at IS NULL",
            (user_id,),
        )
        return int(row["n"]) if row else 0

    # ----- RBAC management (used by RBAC fixtures) -----
    def grant_role(self, user_id: str, role_name: str) -> None:
        self.execute(
            "INSERT INTO user_roles (user_id, role_id) "
            "SELECT %s, id FROM roles WHERE name = %s "
            "ON CONFLICT DO NOTHING",
            (user_id, role_name),
        )

    def revoke_role(self, user_id: str, role_name: str) -> None:
        self.execute(
            "DELETE FROM user_roles "
            "WHERE user_id = %s "
            "AND role_id = (SELECT id FROM roles WHERE name = %s)",
            (user_id, role_name),
        )

    def revoke_all_default_roles(self, user_id: str) -> None:
        self.execute(
            "DELETE FROM user_roles WHERE user_id = %s",
            (user_id,),
        )

    # ----- Cleanup -----
    def hard_delete_user(self, email: str) -> int:
        """Hard-delete a test user (cascades to roles, receipts, etc.)."""
        return self.execute("DELETE FROM users WHERE email = %s", (email,))


__all__ = ["DBHelper"]
