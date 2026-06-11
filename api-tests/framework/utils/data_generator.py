"""
Test-data factories using Faker.

All generators return *fresh* data on every call — never reuse return
values across tests if you need isolation. Use the ``unique_*`` helpers
when guaranteed cross-test uniqueness is required.
"""
from __future__ import annotations

import random
import string
import uuid
from datetime import date, datetime, timedelta
from typing import Any

from faker import Faker

from config import get_settings

_FAKE = Faker()
Faker.seed(None)  # don't fix seed in tests; we want variety per run


# -----------------------------------------------------------------------------
#  User / credential generators
# -----------------------------------------------------------------------------


def unique_email(prefix: str = "qa") -> str:
    """Return a unique RFC-compliant email — collision-free across runs."""
    suffix = uuid.uuid4().hex[:10]
    return f"{prefix}.{suffix}@paytrack-test.dev"


def strong_password(length: int = 14) -> str:
    """Generate a password meeting backend rules (≥ 8 chars, mixed case + digits)."""
    if length < 8:
        length = 8
    pool = string.ascii_letters + string.digits + "!@#$%^&*"
    pwd = [
        random.choice(string.ascii_lowercase),
        random.choice(string.ascii_uppercase),
        random.choice(string.digits),
        random.choice("!@#$%^&*"),
    ]
    pwd += [random.choice(pool) for _ in range(length - 4)]
    random.shuffle(pwd)
    return "".join(pwd)


def random_name() -> str:
    return _FAKE.name()


def new_user_payload(*, email: str | None = None, password: str | None = None) -> dict[str, str]:
    """Build a registration payload."""
    return {
        "email": email or unique_email(),
        "password": password or strong_password(),
        "name": random_name(),
    }


# -----------------------------------------------------------------------------
#  Receipt generators
# -----------------------------------------------------------------------------


def random_category() -> str:
    return random.choice(get_settings().receipts.categories)


def random_currency() -> str:
    return random.choice(get_settings().receipts.currencies)


def random_amount(*, low: float = 1.0, high: float = 9999.0) -> float:
    return round(random.uniform(low, high), 2)


def random_date(*, max_days_ago: int = 90) -> str:
    """Return a YYYY-MM-DD string in the recent past."""
    delta = timedelta(days=random.randint(0, max_days_ago))
    return (date.today() - delta).isoformat()


def receipt_items(count: int | None = None) -> list[dict[str, Any]]:
    """Generate a list of line-items matching the backend item schema."""
    n = count if count is not None else random.randint(1, 4)
    return [
        {
            "name": _FAKE.word().capitalize(),
            "quantity": random.randint(1, 5),
            "price": random_amount(low=10.0, high=500.0),
        }
        for _ in range(n)
    ]


def new_receipt_payload(
    *,
    merchant: str | None = None,
    amount: float | None = None,
    category: str | None = None,
    currency: str | None = None,
    items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Build a payload accepted by ``POST /api/receipts``.

    All fields can be overridden so tests can target specific edge cases.
    """
    return {
        "merchant": merchant or _FAKE.company(),
        "amount": amount if amount is not None else random_amount(),
        "date": random_date(),
        "category": category or random_category(),
        "currency": currency or get_settings().receipts.default_currency,
        "items": items if items is not None else receipt_items(),
        "notes": _FAKE.sentence(nb_words=6),
        "tags": [_FAKE.word(), _FAKE.word()],
        "isManualEntry": True,
    }


# -----------------------------------------------------------------------------
#  Negative-path payloads — convenience constants for parametrised tests
# -----------------------------------------------------------------------------


INVALID_EMAILS: list[str] = [
    "",
    "plainaddress",
    "missing-at-sign.com",
    "@missing-local.com",
    "spaces in@addr.com",
    "trailing@.com",
]


WEAK_PASSWORDS: list[str] = [
    "",
    "short",
    "1234567",
    "       ",
]


__all__ = [
    "INVALID_EMAILS",
    "WEAK_PASSWORDS",
    "new_receipt_payload",
    "new_user_payload",
    "random_amount",
    "random_category",
    "random_currency",
    "random_date",
    "random_name",
    "receipt_items",
    "strong_password",
    "unique_email",
]
