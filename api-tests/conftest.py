"""
Root pytest configuration.

* Imports every fixture module as a plugin so individual test files
  don't need to.
* Writes Allure ``environment.properties`` once per session so the
  report's "Environment" widget is populated automatically.
* Adds an autouse hook that captures any failure's response body as
  an Allure attachment.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Add the project root to ``sys.path`` so ``import framework.*`` works
# regardless of where pytest was invoked from.
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import REPORTS_DIR, get_settings  # noqa: E402  (after sys.path tweak)


# -----------------------------------------------------------------------------
#  Plugin imports — every fixture module is registered as a plugin so any
#  test can request its fixtures without explicit imports.
# -----------------------------------------------------------------------------
pytest_plugins = [
    "framework.fixtures.common_fixtures",
    "framework.fixtures.db_fixtures",
    "framework.fixtures.auth_fixtures",
    "framework.fixtures.receipt_fixtures",
]


# -----------------------------------------------------------------------------
#  Allure environment.properties
# -----------------------------------------------------------------------------


def pytest_configure(config: pytest.Config) -> None:
    """Write Allure environment properties + register dynamic markers."""
    settings = get_settings()

    allure_dir = Path(settings.reporting.allure_results_dir)
    allure_dir.mkdir(parents=True, exist_ok=True)

    env_path = allure_dir / "environment.properties"
    env_path.write_text(
        "\n".join(
            [
                f"TEST_ENV={settings.test_env}",
                f"API_BASE_URL={settings.api.base_url}",
                f"API_PREFIX={settings.api.prefix}",
                f"DB_HOST={settings.database.host}",
                f"DB_NAME={settings.database.name}",
                f"PYTHON_VERSION={sys.version.split()[0]}",
                f"PLATFORM={sys.platform}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    # Useful Allure categories (failure bucket grouping).
    categories_path = allure_dir / "categories.json"
    categories_path.write_text(
        """[
  {"name": "Authentication failures", "matchedStatuses": ["failed"], "messageRegex": ".*Authentication.*"},
  {"name": "Authorization (RBAC) failures", "matchedStatuses": ["failed"], "messageRegex": ".*permission.*|.*Forbidden.*"},
  {"name": "Schema / contract violations", "matchedStatuses": ["failed"], "messageRegex": ".*SchemaValidationError.*"},
  {"name": "Unexpected status code", "matchedStatuses": ["failed"], "messageRegex": ".*UnexpectedStatusError.*"},
  {"name": "Connection / transport errors", "matchedStatuses": ["broken"], "messageRegex": ".*Connection.*|.*Transport.*"}
]
""",
        encoding="utf-8",
    )


# -----------------------------------------------------------------------------
#  Hook to attach failure context to Allure
# -----------------------------------------------------------------------------


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo):
    outcome = yield
    report = outcome.get_result()

    if report.when == "call" and report.failed:
        # Attach captured logs to Allure on failure.
        try:
            import allure

            log_path = ROOT / "logs" / "framework.log"
            if log_path.exists():
                allure.attach.file(
                    str(log_path),
                    name="framework.log (tail)",
                    attachment_type=allure.attachment_type.TEXT,
                )
        except Exception:
            pass


# -----------------------------------------------------------------------------
#  Misc CLI conveniences
# -----------------------------------------------------------------------------


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--env",
        action="store",
        default=None,
        help="Override TEST_ENV at runtime (dev | qa | staging).",
    )


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Apply --env override before any fixture runs."""
    override = config.getoption("--env")
    if override:
        os.environ["TEST_ENV"] = override
        get_settings.cache_clear()  # type: ignore[attr-defined]
