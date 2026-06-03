"""Database fixtures: DBHelper instance and post-test cleanup tracker."""
from __future__ import annotations

from collections.abc import Iterator

import pytest

from framework.utils.db_helper import DBHelper
from framework.utils.logger import get_logger

_LOG = get_logger(__name__)


@pytest.fixture(scope="session")
def db_helper() -> DBHelper:
    """Singleton :class:`DBHelper` for the whole session.

    Connections are still per-call short-lived — only the helper object
    is reused.
    """
    return DBHelper()


@pytest.fixture()
def db_cleanup(db_helper: DBHelper) -> Iterator[list[str]]:
    """
    Yields a list ``track`` — append emails to it during a test and they
    will be hard-deleted on teardown. Use only for users created **outside**
    the standard fixtures (which clean up themselves).
    """
    tracked: list[str] = []
    yield tracked
    for email in tracked:
        try:
            db_helper.hard_delete_user(email)
        except Exception as exc:  # pragma: no cover
            _LOG.warning("DB cleanup failed for %s: %s", email, exc)


__all__ = ["db_cleanup", "db_helper"]
