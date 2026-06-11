# Google-Wallet-PayTrack — Behave BDD Suite

Gherkin-driven scenarios for the PayTrack API. The framework reuses the
sibling [`api-tests/`](../api-tests) framework (HTTP client, JWT helper,
DB helper, data factories) — single source of truth, no duplication.

---

## What's covered

| Feature file | Scenarios | Tags |
|---|---|---|
| `user_registration.feature` | 1 happy + 7 negatives (parametrised) + duplicate | `@auth @registration` |
| `user_login.feature` | 1 happy + 3 negatives | `@auth @login` |
| `receipt_upload.feature` | PNG / PDF / category override | `@receipts @upload` |
| `receipt_search.feature` | Pagination, filter (category / amount), search, autocomplete | `@receipts @search` |
| `receipt_download.feature` | Get-by-id, JSON export, CSV export, 404 path | `@receipts @download` |
| `unauthorized_access.feature` | Anonymous + expired/forged/tampered JWT + viewer RBAC | `@security @unauthorized @jwt @rbac` |
| `invalid_receipt_upload.feature` | No file, bad mime, oversized, 5 invalid payload variants | `@receipts @negative` |

---

## Project layout

```
api-tests-bdd/
├── behave.ini                       # behave config, formatters, junit, allure
├── requirements.txt
├── Makefile
├── .env.example
├── features/
│   ├── environment.py               # before_all / before_scenario / after_scenario hooks
│   ├── user_registration.feature
│   ├── user_login.feature
│   ├── receipt_upload.feature
│   ├── receipt_search.feature
│   ├── receipt_download.feature
│   ├── unauthorized_access.feature
│   ├── invalid_receipt_upload.feature
│   └── steps/
│       ├── common_steps.py          # API reachable, response asserts
│       ├── auth_steps.py            # registration, login, JWT
│       └── receipt_steps.py         # upload, list, search, RBAC
└── support/
    ├── __init__.py                  # bootstraps api-tests/ on sys.path
    └── test_context.py              # typed scenario context object
```

---

## Quickstart

### 1. Install

```bash
cd api-tests-bdd
make install
cp .env.example .env
```

> Requires the sibling `api-tests/` directory at the same level — its
> `framework/` package is imported automatically.

### 2. Verify parsing without running

```bash
make dry-run
```

### 3. Run

| Command | Scope |
|---|---|
| `make smoke` | `@smoke`-tagged scenarios |
| `make regression` | Full sweep |
| `make auth` / `receipts` / `security` | By tag |
| `make registration` / `login` / `upload` / `search` / `download` / `invalid` / `unauthorized` | By feature file |
| `behave -t @smoke -t ~@slow` | Combine tag expressions |
| `behave -D default_environment=qa` | Override environment via userdata |

### 4. Reports

```bash
make report           # Allure live (requires `allure` CLI)
make report-static    # Allure → reports/allure-report/index.html
ls reports/junit      # JUnit XML for CI
```

---

## Architecture decisions

* **Single source of truth.** No copy-pasted clients — `support/__init__.py`
  prepends `../api-tests` to `sys.path`, then steps import directly from
  `framework.clients`, `framework.utils.*`, `framework.schemas`. Bug fixes
  in the API-tests framework instantly apply to BDD.
* **Typed context.** `TestContext` (a dataclass on `context.tc`) replaces
  ad-hoc attributes. Refactor-safe and self-documenting.
* **Strict cleanup.** Every scenario tracks created users / receipts /
  temp files, drained in `after_scenario` regardless of outcome.
* **Backend health probe** runs once per scenario via `tenacity` retry.
  Fail-fast: if the backend is down, the scenario reports a clean
  "API unreachable" rather than 17 cascading 5xx assertions.
* **Tag taxonomy.** `@smoke / @regression / @happy / @negative` for
  intent; `@auth / @receipts / @security / @rbac / @jwt` for area.
  CI matrices key off these.

---

## Adding scenarios

1. Pick (or create) the feature file under `features/`.
2. Reuse existing step phrases when possible — `behave --dry-run` will
   show you which steps are unbound.
3. Add new steps in the closest of `common_steps.py / auth_steps.py /
   receipt_steps.py`. Avoid `*_steps.py` files per feature — that
   fragments shared steps.
4. Tag the scenario.
5. Run `make dry-run` then the targeted feature command.
