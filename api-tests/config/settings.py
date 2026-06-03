"""
Centralised configuration loader.

Resolution order (highest precedence first):
1. Shell environment variables
2. `.env` file at framework root
3. YAML file `config/config.<TEST_ENV>.yaml`
4. Hard-coded defaults

The loaded object is a singleton (`get_settings()`), cached for the
lifetime of the test run so that every fixture / client sees the same
view of the world.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
#  Paths
# -----------------------------------------------------------------------------
ROOT_DIR: Path = Path(__file__).resolve().parent.parent
CONFIG_DIR: Path = ROOT_DIR / "config"
DATA_DIR: Path = ROOT_DIR / "data"
LOGS_DIR: Path = ROOT_DIR / "logs"
REPORTS_DIR: Path = ROOT_DIR / "reports"

# -----------------------------------------------------------------------------
#  Typed sub-models
# -----------------------------------------------------------------------------


class RetryConfig(BaseModel):
    total: int = 3
    backoff_factor: float = 0.5
    status_forcelist: list[int] = Field(default_factory=lambda: [429, 500, 502, 503, 504])


class APIConfig(BaseModel):
    base_url: str = "http://localhost:5000"
    prefix: str = "/api"
    timeout_seconds: int = 30
    verify_ssl: bool = False
    retry: RetryConfig = RetryConfig()

    @property
    def url(self) -> str:
        """Base URL + prefix, no trailing slash."""
        return f"{self.base_url.rstrip('/')}{self.prefix}"


class RoleConfig(BaseModel):
    permissions: list[str] = Field(default_factory=list)


class AuthConfig(BaseModel):
    jwt_secret: str = "change-me-to-at-least-32-random-characters-please"
    jwt_access_expiry_seconds: int = 900
    jwt_refresh_expiry_seconds: int = 604800
    default_role: str = "user"
    roles: dict[str, RoleConfig] = Field(default_factory=dict)
    admin_user_email: str | None = None
    admin_user_password: str | None = None
    viewer_user_email: str | None = None
    viewer_user_password: str | None = None


class DatabaseConfig(BaseModel):
    host: str = "localhost"
    port: int = 5432
    name: str = "paytrack_test"
    user: str = "paytrack"
    password: str = "paytrack"
    pool_size: int = 5

    @property
    def dsn(self) -> str:
        return (
            f"postgresql://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.name}"
        )


class ReportingConfig(BaseModel):
    allure_results_dir: str = "reports/allure-results"
    html_report_path: str = "reports/html/report.html"
    log_level: str = "INFO"


class ReceiptsConfig(BaseModel):
    categories: list[str] = Field(default_factory=lambda: [
        "Food", "Transport", "Shopping", "Bills",
        "Entertainment", "Health", "Other",
    ])
    currencies: list[str] = Field(default_factory=lambda: [
        "INR", "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY",
    ])
    default_currency: str = "INR"
    max_file_size_bytes: int = 10_485_760
    allowed_file_types: list[str] = Field(default_factory=lambda: [
        "image/jpeg", "image/png", "application/pdf",
    ])


class Settings(BaseModel):
    """Top-level immutable test-run configuration."""

    test_env: str = "dev"
    api: APIConfig = APIConfig()
    auth: AuthConfig = AuthConfig()
    database: DatabaseConfig = DatabaseConfig()
    reporting: ReportingConfig = ReportingConfig()
    receipts: ReceiptsConfig = ReceiptsConfig()

    model_config = {"frozen": True}


# -----------------------------------------------------------------------------
#  Loader
# -----------------------------------------------------------------------------


def _load_yaml(env: str) -> dict[str, Any]:
    """Read `config/config.<env>.yaml` and return its dict (or empty dict)."""
    yaml_path = CONFIG_DIR / f"config.{env}.yaml"
    if not yaml_path.exists():
        return {}
    with yaml_path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def _apply_env_overrides(data: dict[str, Any]) -> dict[str, Any]:
    """Override YAML values with shell / .env values where defined."""
    api = data.setdefault("api", {})
    if (v := os.getenv("API_BASE_URL")):
        api["base_url"] = v
    if (v := os.getenv("API_PREFIX")):
        api["prefix"] = v
    if (v := os.getenv("API_TIMEOUT_SECONDS")):
        api["timeout_seconds"] = int(v)
    if (v := os.getenv("API_VERIFY_SSL")):
        api["verify_ssl"] = v.lower() in {"1", "true", "yes"}

    auth = data.setdefault("auth", {})
    if (v := os.getenv("JWT_SECRET")):
        auth["jwt_secret"] = v
    if (v := os.getenv("JWT_ACCESS_EXPIRY_SECONDS")):
        auth["jwt_access_expiry_seconds"] = int(v)
    if (v := os.getenv("JWT_REFRESH_EXPIRY_SECONDS")):
        auth["jwt_refresh_expiry_seconds"] = int(v)
    if (v := os.getenv("ADMIN_USER_EMAIL")):
        auth["admin_user_email"] = v
    if (v := os.getenv("ADMIN_USER_PASSWORD")):
        auth["admin_user_password"] = v
    if (v := os.getenv("VIEWER_USER_EMAIL")):
        auth["viewer_user_email"] = v
    if (v := os.getenv("VIEWER_USER_PASSWORD")):
        auth["viewer_user_password"] = v

    db = data.setdefault("database", {})
    if (v := os.getenv("DB_HOST")):
        db["host"] = v
    if (v := os.getenv("DB_PORT")):
        db["port"] = int(v)
    if (v := os.getenv("DB_NAME")):
        db["name"] = v
    if (v := os.getenv("DB_USER")):
        db["user"] = v
    if (v := os.getenv("DB_PASSWORD")):
        db["password"] = v

    reporting = data.setdefault("reporting", {})
    if (v := os.getenv("ALLURE_RESULTS_DIR")):
        reporting["allure_results_dir"] = v
    if (v := os.getenv("HTML_REPORT_PATH")):
        reporting["html_report_path"] = v
    if (v := os.getenv("LOG_LEVEL")):
        reporting["log_level"] = v

    return data


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Build (and cache) the framework-wide :class:`Settings` instance.

    The result is cached so that re-importing the module across many
    parallel pytest workers still gives a consistent view per-process.
    """
    # Load .env once.
    dotenv_path = ROOT_DIR / ".env"
    if dotenv_path.exists():
        load_dotenv(dotenv_path)

    test_env = os.getenv("TEST_ENV", "dev").lower()

    raw: dict[str, Any] = _load_yaml(test_env)
    raw["test_env"] = test_env
    raw = _apply_env_overrides(raw)

    return Settings(**raw)


__all__ = [
    "Settings",
    "APIConfig",
    "AuthConfig",
    "DatabaseConfig",
    "ReportingConfig",
    "ReceiptsConfig",
    "RoleConfig",
    "get_settings",
    "ROOT_DIR",
    "DATA_DIR",
    "LOGS_DIR",
    "REPORTS_DIR",
]
