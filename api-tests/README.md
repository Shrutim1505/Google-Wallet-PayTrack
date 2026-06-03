# Google-Wallet-PayTrack — API Automation Framework

Production-grade Python/Pytest API automation framework for the PayTrack
backend. Written following SDET industry standards: config-driven, parallel,
fully-isolated tests with first-class JWT, RBAC and DB validation.

---

## Table of contents

1. [Highlights](#highlights)
2. [Project layout](#project-layout)
3. [Quickstart](#quickstart)
4. [Running tests](#running-tests)
5. [Configuration](#configuration)
6. [Reporting](#reporting)
7. [Adding new tests](#adding-new-tests)
8. [Troubleshooting](#troubleshooting)

---

## Highlights

| Capability | How it's delivered |
|---|---|
| **HTTP** | `requests.Session` with retry/backoff, idempotency keys, redacted logging |
| **Config-driven** | YAML per environment (`config.dev.yaml`, …) + `.env` + shell vars |
| **Reusable utils** | Faker data factories, JWT forge/decode, DB helper, file helper, retry helper |
| **Fixtures** | Per-test isolated users, admin/viewer fixtures (DB-promoted), receipt seeders, DB cleanup tracker |
| **Logging** | Rich console + rotating file logs; tail attached to Allure on failure |
| **HTML reports** | `pytest-html` self-contained report at `reports/html/report.html` |
| **Allure reports** | Steps, attachments, environment, categories, severity, story/feature/epic tags |
| **Parallel** | `pytest-xdist` (`-n auto`, distribution by file to avoid token bleed) |
| **Retry** | `pytest-rerunfailures` for flaky-network resilience |
| **JWT testing** | Forge expired / wrong-secret / tampered / unsigned tokens; assert backend rejection |
| **RBAC testing** | Admin / user / viewer via DB role grants — verifies DB ↔ JWT consistency |
| **DB validation** | psycopg2 reads validating users / receipts / RBAC after API operations |
| **CI** | GitHub Actions matrix (smoke + regression), Allure + HTML artifacts |

---

## Project layout

```
api-tests/
├── conftest.py                  # plugin registration, Allure metadata, hooks
├── pytest.ini                   # markers, addopts, logging, timeout
├── requirements.txt             # pinned dependencies
├── Makefile                     # convenience targets
├── .env.example
├── config/
│   ├── settings.py              # typed config loader (Pydantic, .env > YAML > defaults)
│   └── config.dev.yaml
├── framework/
│   ├── core/                    # APIClient, APIResponse, exceptions, assertions
│   ├── clients/                 # AuthClient, ReceiptsClient, HealthClient
│   ├── models/                  # User / AuthResult / Receipt Pydantic models
│   ├── schemas/                 # JSON-schemas (auth, receipt, RFC-7807 errors)
│   ├── utils/                   # logger, data_generator, jwt_helper, db_helper, file_helper, retry
│   └── fixtures/                # common, auth, db, receipt fixtures
├── data/                        # static JSON test fixtures
├── tests/
│   ├── auth/                    # registration, login, logout, password reset
│   ├── jwt_security/            # JWT contract + negative paths
│   ├── receipts/                # CRUD, upload, list/filter, autocomplete, export
│   ├── rbac/                    # admin, user, viewer roles
│   ├── db/                      # post-API state validation
│   ├── health/                  # liveness / readiness probes
│   └── e2e/                     # full user journey
├── reports/                     # generated — gitignored
└── .github/workflows/api-tests.yml
```

---

## Quickstart

### 1. Prerequisites

* Python ≥ 3.10 (recommended 3.12)
* PayTrack backend running locally (`http://localhost:5000`) with PostgreSQL
* Optional: [Allure CLI](https://allurereport.org/docs/install/) for `make report`

### 2. Install

```bash
cd api-tests
make install
cp .env.example .env
# edit .env to point at your backend / DB
```

If you don't use `make`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Smoke-run

```bash
make smoke
# or
pytest -m smoke -v
```

---

## Running tests

| Command | What it does |
|---|---|
| `make smoke` | Critical-path tests (`-m smoke`) — runs in seconds |
| `make sanity` | Build verification subset |
| `make regression` | Full functional regression with retries |
| `make parallel` | Full suite with `pytest-xdist` (loadfile distribution) |
| `make auth` / `receipts` / `rbac` / `jwt` / `db` / `health` / `e2e` | Just that domain |
| `pytest -k test_login` | Run by name pattern |
| `pytest --env qa` | Run against `config.qa.yaml` |
| `pytest --reruns=2 -m flaky` | Retry flaky tests twice |

### Parallel execution details

The framework uses `--dist=loadfile` so tests in the same file land on the
same worker. This guarantees that fixture-scoped tokens are not consumed
by a different worker mid-test — the most common source of false negatives
in parallel API runs.

To control workers:

```bash
make parallel WORKERS=4    # explicit
make parallel WORKERS=auto # default — uses logical CPU count
```

---

## Configuration

Resolution order (highest precedence first):

1. Shell environment variables
2. `.env` file
3. `config/config.<TEST_ENV>.yaml`
4. Hard-coded defaults in `config/settings.py`

Useful env vars (see `.env.example`):

| Variable | Purpose |
|---|---|
| `TEST_ENV` | Selects YAML file (`dev`, `qa`, `staging`) |
| `API_BASE_URL` | Override backend URL |
| `JWT_SECRET` | Must match backend secret for forged-token tests |
| `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Postgres for DB-validation suite |
| `LOG_LEVEL` | `DEBUG` for verbose request/response logs |
| `PARALLEL_WORKERS` | Default for `make parallel` |

To target a non-dev environment, copy `config.dev.yaml`:

```bash
cp config/config.dev.yaml config/config.qa.yaml
# edit, then:
TEST_ENV=qa pytest
# or
pytest --env qa
```

---

## Reporting

### Allure (recommended)

```bash
make regression
make report          # `allure serve` — opens browser
# or for static export:
make report-static
```

The framework automatically populates the report's:

* **Environment widget** — base URL, DB host, Python version
* **Categories widget** — failure buckets (Auth / RBAC / Schema / Connection)
* **Steps timeline** — every assertion is a labelled step
* **Attachments** — request + response bodies, headers, log tail on failure
* **Severity / story / feature / epic** tags from `@allure.*` decorators

### HTML (single file, no CLI needed)

```bash
pytest
open reports/html/report.html   # macOS
xdg-open reports/html/report.html  # Linux
```

Self-contained — share the file directly.

---

## Adding new tests

1. **Pick a domain** — drop the file under `tests/<domain>/test_<thing>.py`.
2. **Use existing fixtures** (see `framework/fixtures/`):
   * `auth_client`, `regular_user`, `admin_user`, `viewer_user`
   * `receipts_client` (auto-authed), `created_receipt`, `seeded_receipts`
   * `db_helper`, `db_cleanup`
3. **Use the shared assertions** from `framework.core.assertions` — they
   wrap each check in an Allure step, so the report reads like a story.
4. **Tag with markers** — `@pytest.mark.smoke`, `@pytest.mark.regression`,
   `@pytest.mark.negative`, etc.
5. **Annotate with Allure decorators** — `@allure.epic`, `@allure.feature`,
   `@allure.story`, `@allure.severity`.

Skeleton example:

```python
import allure
import pytest

from framework.clients import ReceiptsClient
from framework.core.assertions import assert_ok, assert_eq
from framework.utils.data_generator import new_receipt_payload


@allure.epic("Receipts")
@allure.feature("My new feature")
@pytest.mark.receipts
class TestMyFeature:

    @pytest.mark.smoke
    @allure.story("Happy path")
    def test_does_the_thing(self, receipts_client: ReceiptsClient) -> None:
        resp = receipts_client.create(new_receipt_payload())
        assert_ok(resp)
        assert_eq(resp.data["category"], "Food", label="category")
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ConnectionRefused: localhost:5000` | Backend not running. `cd backend && npm run dev`. |
| DB-validation tests skipped/failing on connect | Postgres not running, or `DB_*` vars wrong. Check `make install` then `psql -h $DB_HOST`. |
| All JWT-forge tests failing | `JWT_SECRET` in `.env` doesn't match backend. |
| Parallel runs flaky | Drop `-n` workers, or run only `-m smoke -n 2` first to isolate. |
| `pytest --collect-only` errors | Run `make lint` to surface import errors. |
| Allure CLI missing | `brew install allure` (macOS) or download from allurereport.org. The HTML report from `pytest-html` is always generated regardless. |

---

## License

Internal — same license as the parent PayTrack project.
