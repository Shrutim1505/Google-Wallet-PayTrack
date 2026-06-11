# PayTrack — Project Summary

A full-stack receipt management and personal finance tracking system. Users upload receipts (image or manual entry), the system extracts data using OCR, categorizes expenses, tracks spending against budgets, and provides analytics with real-time notifications.

---

## Tech Stack

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with `pg` (connection pooling, max 20 connections)
- **Auth:** JWT (access + refresh tokens) + bcrypt
- **Authorization:** Custom RBAC (Role-Based Access Control)
- **OCR:** Google Cloud Vision API (`@google-cloud/vision`)
- **Validation:** Joi schemas
- **Real-time:** Socket.IO
- **Logging:** Pino (structured JSON logs)
- **Testing:** Vitest (26 tests)

### Frontend
- React 18 + TypeScript, Vite 5, Tailwind CSS, Axios

---

## Architecture

```
Frontend (React + TS + Vite)
       ↓ HTTP/JSON
Backend (Express + TS)
  ├── Routes (API endpoints + RBAC checks)
  ├── Controllers (request handlers)
  ├── Services (business logic)
  ├── Middleware (auth, validation, rate limiting, error handling)
  └── Config (database pool, environment, websocket)
       ↓ SQL (parameterized)
PostgreSQL
  ├── users, user_settings
  ├── roles, permissions, user_roles, role_permissions (RBAC)
  ├── receipts, budgets, splits
  └── smart_alerts, ml_training_data
```

Layered architecture: Controller → Service → Database.

---

## Core Features

### Authentication
- Email/password registration with bcrypt (cost 12)
- JWT access token (15min) + refresh token (7d) with rotation
- Refresh tokens blacklisted on use; reuse is rejected
- Password change flow with current-password verification

### RBAC (3 roles, 14 permissions)
| Role | Access |
|------|--------|
| **admin** | Full access (including user/role management) |
| **user** | CRUD own resources + analytics |
| **viewer** | Read-only |

Enforced via `requirePermission('receipts:create')` middleware at route level.

### Receipts
- Manual entry or image upload (multer, 10MB limit, jpeg/png/pdf only)
- OCR via Google Cloud Vision `documentTextDetection` (English + Hindi hints)
- Local regex-based fallback when Vision API unavailable
- Pagination, filters (category, date range, amount range, search)
- Export as JSON or CSV

### Budgets
- Per-category budgets (daily/weekly/monthly/yearly)
- Spending vs budget with alert thresholds (default 80%)

### Analytics
- All-time and monthly breakdowns
- Category aggregations via SQL `GROUP BY` with composite indexes

### Smart Alerts
- Spending spikes (>40% vs last week)
- Unusual merchants (first-time, >2× avg receipt)
- Budget warnings at 75% and 90%
- Weekly digest

### Additional
- **Duplicate detection** — Jaro-Winkler + amount/date proximity
- **ML categorization** — Naive Bayes with Laplace smoothing
- **Recurring detection** — Interval analysis with CV
- **Expense splits** — Shareable tokens with participant tracking
- **Real-time sync** — Socket.IO events (`receipt:created`, `budget:warning`)

---

## Database Design

### Key Tables
- **users** — UUID PK, unique email, bcrypt hash, JSONB preferences
- **receipts** — FK to users, NUMERIC(12,2) amount, JSONB items/tags, CASCADE
- **budgets** — UNIQUE(user_id, category, period)
- **roles / permissions / user_roles / role_permissions** — RBAC junction tables

### Indexes
```sql
idx_receipts_user_date           -- pagination
idx_receipts_user_category       -- category filtering
idx_receipts_user_amount         -- amount filters
idx_receipts_user_date_category  -- analytics
idx_receipts_merchant_trgm       -- fuzzy search (pg_trgm)
```

### ACID Transactions
`runTransaction()` uses a dedicated PG client with BEGIN/COMMIT/ROLLBACK. Tested: partial writes don't persist on failure.

---

## Security
- Parameterized queries (no SQL injection)
- Helmet (security headers), strict CORS
- Rate limiting: 100/15min API, 5/15min auth, 20/hr uploads
- JWT secret required in production
- Joi validation for body/params/query
- File upload MIME + size validation
- Bcrypt cost 12

---

## Testing

**26 automated tests:**
- `auth.test.ts` (9) — register, login, token refresh/rotation, password change
- `rbac.test.ts` (8) — admin/user/viewer role/permission checks
- `receipts.test.ts` (9) — CRUD, pagination, filtering, ACID rollback

**Benchmark** — Seeds 50k receipts and compares query latency with/without indexes.

---

## Observability
- Structured JSON logging (Pino)
- Request ID correlation (x-request-id header)
- Health check endpoint (`/health`)
- Graceful shutdown (SIGTERM/SIGINT with 10s force-kill)

---

## API Surface (~30 endpoints)

| Resource | Endpoints |
|----------|-----------|
| `/api/auth` | register, login, verify, refresh, logout, change-password |
| `/api/receipts` | CRUD + upload + export |
| `/api/budgets` | CRUD + status |
| `/api/analytics` | summary |
| `/api/settings` | get, update |
| `/api/ai`, `/api/wallet`, `/api/features` | OCR, Google Wallet, feature flags |

Plus WebSocket events for real-time updates.

---

## What This Project Demonstrates

| Skill | Evidence |
|-------|----------|
| Database design | Normalized schema, FK, JSONB, composite indexes, ACID |
| API design | RESTful, paginated, validated, consistent responses |
| Authentication | JWT + refresh rotation, bcrypt, blacklist |
| Authorization | Full RBAC with junction tables |
| Error handling | Centralized middleware, custom AppError class |
| Security | Rate limiting, validation, parameterized queries |
| Testing | Unit + integration with real DB, ACID verification |
| Performance | Index design + benchmark script |
| Real-time | WebSocket with JWT auth and user rooms |
| 3rd-party integration | Google Cloud Vision API |
| DevOps | Graceful shutdown, health checks, structured logs, env config |

---

## Resume-Ready Description

> **PayTrack | React, TypeScript, Node.js, Express, PostgreSQL, Google Cloud Vision API**
> - Built RESTful backend APIs using Node.js/Express and PostgreSQL with JWT authentication (access + refresh tokens with rotation) and RBAC supporting 3 roles and 14 granular permissions for secure receipt workflows.
> - Integrated Google Cloud Vision API with `documentTextDetection` for OCR-based receipt parsing, with regex fallback and NLP-style pattern matching for merchant/date/amount extraction.
> - Designed PostgreSQL schema with composite indexes, ACID-compliant transactions using dedicated client connections, and benchmarked query performance via automated script seeding 50k rows.
> - Wrote 26 integration tests covering auth flows, RBAC permission enforcement, CRUD operations, and transaction rollback on failure.

---

## Quick Start

```bash
# Prerequisites: Node 16+, PostgreSQL running locally
createdb paytrack
createdb paytrack_test

cd backend
npm install
DATABASE_URL="postgresql://localhost:5432/paytrack" npm run dev

# In another terminal:
npm run test                                              # Run 26 tests
DATABASE_URL="postgresql://localhost:5432/paytrack" \
  npm run benchmark                                       # Performance benchmark
```

**Demo account:** `demo@example.com` / `password`

See `API_TESTING.md` for full curl command reference.
