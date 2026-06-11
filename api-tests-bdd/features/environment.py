"""
Behave global hooks — orchestrate the lifecycle around every feature/scenario.

Hooks executed by Behave (in order):
    before_all → before_feature → before_scenario → step → after_scenario
                                                          → after_feature → after_all
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

# Bootstrap the sibling api-tests framework so `framework.*` imports resolve.
_BDD_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BDD_ROOT))
import support  # noqa: F401  (side effect: registers api-tests on sys.path)

from behave.model import Feature, Scenario  # noqa: E402
from behave.runner import Context  # noqa: E402

from config import get_settings  # noqa: E402  (from api-tests/config)
from framework.utils.db_helper import DBHelper  # noqa: E402
from framework.utils.logger import get_logger  # noqa: E402
from support.test_context import TestContext  # noqa: E402


_LOG = get_logger("bdd.environment")


# -----------------------------------------------------------------------------
#  before_all — once per behave invocation
# -----------------------------------------------------------------------------


def before_all(context: Context) -> None:
    """Initialise framework-wide state before any feature runs."""

    # Surface userdata-defined environment override.
    env = context.config.userdata.get("default_environment", os.getenv("TEST_ENV", "dev"))
    os.environ.setdefault("TEST_ENV", env)

    settings = get_settings()
    context.settings = settings
    context.db_helper = DBHelper()

    _LOG.info(
        "Behave run starting | env=%s | api=%s | db=%s",
        settings.test_env, settings.api.url, settings.database.host,
    )

    # Ensure report directories exist.
    for directory in ("reports/allure-results", "reports/junit", "logs"):
        Path(_BDD_ROOT / directory).mkdir(parents=True, exist_ok=True)

    # Behave can swallow tracebacks — keep them visible during local dev.
    context.config.verbose = True


# -----------------------------------------------------------------------------
#  before_feature
# -----------------------------------------------------------------------------


def before_feature(context: Context, feature: Feature) -> None:
    _LOG.info("──────────  Feature: %s  ──────────", feature.name)


# -----------------------------------------------------------------------------
#  before_scenario — fresh test_context per scenario
# -----------------------------------------------------------------------------


def before_scenario(context: Context, scenario: Scenario) -> None:
    _LOG.info("Scenario: %s | tags=%s", scenario.name, scenario.tags)
    context.tc = TestContext()


# -----------------------------------------------------------------------------
#  after_scenario — cleanup users / receipts / temp files
# -----------------------------------------------------------------------------


def after_scenario(context: Context, scenario: Scenario) -> None:
    tc: TestContext = getattr(context, "tc", None)
    if tc is None:
        return

    db: DBHelper = context.db_helper

    # Best-effort: revoke auth tokens.
    if tc.user_token:
        try:
            tc.auth_client.set_token(tc.user_token).logout(
                refresh_token=tc.user_refresh_token
            )
        except Exception:
            pass

    # DB cleanup — removes user (cascades to receipts, roles).
    for email in tc.cleanup_emails:
        try:
            db.hard_delete_user(email)
        except Exception as exc:
            _LOG.warning("DB cleanup of %s failed: %s", email, exc)

    # Best-effort delete of any explicitly-tracked receipts.
    for rid in tc.cleanup_receipt_ids:
        try:
            tc.receipts_client.delete(rid)
        except Exception:
            pass

    # Filesystem cleanup.
    for path in tc.cleanup_files:
        try:
            Path(path).unlink(missing_ok=True)
        except Exception:
            pass

    tc.close()

    if scenario.status == "failed":
        _LOG.error("Scenario FAILED: %s", scenario.name)
    else:
        _LOG.info("Scenario %s: %s", scenario.status.name, scenario.name)


# -----------------------------------------------------------------------------
#  after_all
# -----------------------------------------------------------------------------


def after_all(context: Context) -> None:
    _LOG.info(
        "Behave run finished | duration=%.1fs",
        getattr(context, "duration", 0),
    )
    # Flush any open log handlers.
    logging.shutdown()
