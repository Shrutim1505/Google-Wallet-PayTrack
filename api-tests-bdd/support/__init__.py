"""
Support package for the Behave BDD suite.

This module wires the sibling ``api-tests`` framework into ``sys.path``
so step-definitions can import the existing :mod:`framework` package
directly. Single source of truth — no copy-pasted clients or fixtures.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Repo layout: <repo>/api-tests/  and  <repo>/api-tests-bdd/
_HERE = Path(__file__).resolve().parent
_REPO_ROOT = _HERE.parent.parent
_API_TESTS_ROOT = _REPO_ROOT / "api-tests"

if _API_TESTS_ROOT.exists() and str(_API_TESTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_API_TESTS_ROOT))

# ---------------------------------------------------------------------------
#  Optional: also load .env from the BDD project root.
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv

    load_dotenv(_HERE.parent / ".env")
except ImportError:
    pass

# Safety: silence any “module already imported” warnings on re-init
os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")

__all__ = ["_API_TESTS_ROOT", "_REPO_ROOT"]
