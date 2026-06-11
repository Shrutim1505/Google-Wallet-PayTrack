"""
Centralised logger for the test framework.

* Console output uses Rich for human-friendly colour / formatting.
* File output mirrors what pytest captures (`logs/pytest.log`).
* Each module gets its own named logger via :func:`get_logger`,
  so the log lines tell you which client / fixture emitted them.
"""
from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from rich.logging import RichHandler

from config import LOGS_DIR, get_settings

_LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_initialised: bool = False


def _ensure_initialised() -> None:
    """Configure the root logger exactly once per process."""
    global _initialised
    if _initialised:
        return

    settings = get_settings()
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger("paytrack")
    root.setLevel(settings.reporting.log_level.upper())
    root.propagate = False

    # ---------- Console (Rich) ----------
    console_handler = RichHandler(
        rich_tracebacks=True,
        markup=False,
        show_path=False,
        show_time=False,
        log_time_format="[%X]",
    )
    console_handler.setLevel(settings.reporting.log_level.upper())
    root.addHandler(console_handler)

    # ---------- File (rotating) ----------
    log_file: Path = LOGS_DIR / "framework.log"
    file_handler = RotatingFileHandler(
        log_file, maxBytes=5_000_000, backupCount=3, encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(_LOG_FORMAT, _DATE_FORMAT))
    root.addHandler(file_handler)

    # Silence noisy 3rd-party loggers.
    for noisy in ("urllib3", "asyncio", "faker", "PIL"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    _initialised = True


def get_logger(name: str) -> logging.Logger:
    """
    Return a child logger under the ``paytrack`` namespace.

    Parameters
    ----------
    name : str
        Usually ``__name__`` of the calling module.
    """
    _ensure_initialised()
    if name.startswith("paytrack"):
        return logging.getLogger(name)
    return logging.getLogger(f"paytrack.{name}")


__all__ = ["get_logger"]
