# PayTrack — Smart Receipt Management System

Production-grade receipt management and personal finance tracking platform. OCR-based receipt parsing, real-time notifications, RBAC, observability — built to scale.

[![CI](https://github.com/Shrutim1505/Google-Wallet-PayTrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Shrutim1505/Google-Wallet-PayTrack/actions)

---

## Quick Start

### Option 1: Docker Compose (everything containerized)

```bash
git clone https://github.com/Shrutim1505/Google-Wallet-PayTrack.git
cd Google-Wallet-PayTrack
docker compose up -d

# Services:
#   Frontend: http://localhost:5173
#   Backend:  http://localhost:5000
#   API Docs: http://localhost:5000/api/docs
#   Metrics:  http://localhost:5000/metrics
```

### Option 2: Local development

```bash
# Start Postgres + Redis in Docker, run backend/frontend locally
docker compose -f docker-compose.dev.yml up -d

# Backend
cd backend
cp .env.example .env.local
npm install
npm run migrate up
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## Architecture

```
                    ┌─────────────────────────┐
                    │   CDN / Load Balancer   │
                    └─────────────┬───────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
     │  Node Instance 1│ │  Node Instance 2│ │  Node Instance N│
     │   (Express API) │ │   (Express API) │ │   (Express API) │
     └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
              │                   │                   │
              └───────────┬───────┴───────────┬───────┘
                          │                   │
                 ┌────────▼─────────┐ ┌───────▼────────┐
                 │    PostgreSQL    │ │     Redis      │
                 │  (primary data)  │ │ (cache, queue) │
                 └──────────────────┘ └────────────────┘
                          │
                          │ async jobs
                 ┌────────▼─────────┐
                 │  OCR / ML Worker │
                 │  (Google Vision) │
                 └──────────────────┘
```

**Stateless backend instances** scale horizontally. Redis holds token blacklist, idempotency keys, and BullMQ job queue. PostgreSQL is the system of record.

---

## Key Engineering Features

### Security
- ✅ JWT with access + refresh token rotation
- ✅ Refresh tokens blacklisted on use (Redis-backed)
- ✅ Permissions embedded in JWT — **zero DB calls per authenticated request**
- ✅ RBAC (admin / user / viewer) with 14 granular permissions
- ✅ Bcrypt cost 12, parameterized queries, Helmet headers
- ✅ Rate limiting: 100/15min API, 5/15min auth, 20/hr uploads
- ✅ Input validation via Joi with RFC 7807 Problem Details errors
- ✅ Idempotency keys (Stripe-style) prevent duplicate creation
- ✅ Password reset flow with single-use tokens
- ✅ Strict env validation via zod (fails fast on misconfiguration)
- ✅ Trust proxy configured (rate-limit bypass protection)
- ✅ User enumeration prevention (same error for missing user vs wrong password)

### Observability
- ✅ **Pino** structured JSON logging with request ID correlation
- ✅ **Prometheus** metrics at `/metrics` (request duration histograms, counters)
- ✅ **Sentry** error tracking with PII scrubbing
- ✅ **Deep health checks**: `/health/live` (K8s liveness) + `/health/ready` (dependency checks)
- ✅ **OpenAPI 3.1** docs at `/api/docs` with Swagger UI
- ✅ RFC 7807 Problem Details error responses

### Reliability & Scalability
- ✅ **Stateless design** — all session/cache state in Redis
- ✅ **Connection retry** on database startup (5 attempts, 2s backoff)
- ✅ **Graceful shutdown** — SIGTERM handler, 15s force-kill timeout
- ✅ **Uncaught exception handler** — fails fast, supervisor restarts
- ✅ **Compression** + **keep-alive** for lower latency
- ✅ **Connection pooling** (PG pool of 20 per instance)

### Database
- ✅ **Versioned migrations** (`node-pg-migrate`) — rollback-safe
- ✅ **ACID transactions** with dedicated clients (tested with rollback verification)
- ✅ **Composite indexes**: `(user_id, date DESC)`, `(user_id, category)`, `(user_id, amount)`
- ✅ **Soft deletes** (`deleted_at` column) for data recovery
- ✅ **Cascade deletes** on user removal (GDPR-friendly)
- ✅ **JSONB** columns for flexible items/tags storage
- ✅ **UUID** primary keys (no ID enumeration attacks)

### DevOps
- ✅ **Multi-stage Dockerfile** (non-root user, tini for signals, healthcheck)
- ✅ **Docker Compose** for local dev + production
- ✅ **GitHub Actions CI** — compile, test, build, audit on every push
- ✅ **.dockerignore** for small images
- ✅ **Prometheus + Grafana** ready

---

## API Surface

### Public
- `GET /health/live` — K8s liveness probe
- `GET /health/ready` — K8s readiness probe (checks DB + cache)
- `GET /metrics` — Prometheus metrics
- `GET /api/docs` — Swagger UI
- `GET /api/openapi.json` — OpenAPI spec

### Authenticated (`/api/v1/`)
| Resource | Endpoints |
|----------|-----------|
| `auth` | register, login, verify, refresh, logout, change-password, password-reset/request, password-reset/confirm |
| `receipts` | CRUD + upload (OCR) + export (CSV/JSON) |
| `budgets` | CRUD + status (spending vs budget) |
| `analytics` | summary (all-time + monthly aggregations) |
| `settings` | get, update |
| `ai` | category prediction, ML stats |
| `wallet` | Google Wallet pass generation |

---

## Tech Stack

**Backend:** Node.js 20 · TypeScript · Express · PostgreSQL 16 · Redis 7 · BullMQ · Socket.IO · Pino · Sentry · Prometheus · Joi · Zod · Jest/Vitest

**Frontend:** React 18 · TypeScript · Vite 5 · Tailwind CSS · Axios · React Hot Toast

**OCR:** Google Cloud Vision API

**Infra:** Docker · GitHub Actions · Nginx

---

## Development Commands

```bash
# Backend
npm run dev              # Dev server with hot reload
npm run build            # TypeScript compile
npm test                 # Run 26 tests
npm run test:coverage    # With coverage report
npm run benchmark        # Query performance benchmark
npm run migrate up       # Apply migrations
npm run migrate down     # Rollback last migration
npm run migrate create my-migration  # Create new migration

# Frontend
npm run dev              # Vite dev server
npm run build            # Production build
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` (`openssl rand -hex 32`)
- [ ] Provision Redis (`REDIS_URL` required)
- [ ] Provision managed Postgres with backups
- [ ] Configure `SENTRY_DSN` for error tracking
- [ ] Set `ALLOWED_ORIGINS` to production domains only
- [ ] Run migrations: `npm run migrate up`
- [ ] Configure HTTPS termination at load balancer
- [ ] Set up Prometheus scraping of `/metrics`
- [ ] Configure K8s probes: `liveness=/health/live`, `readiness=/health/ready`
- [ ] Set up log aggregation (ELK / Datadog / CloudWatch)
- [ ] Configure rate-limit IPs for your load balancer

---

## Documentation

- [API_TESTING.md](./backend/API_TESTING.md) — curl examples for all endpoints
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) — architecture deep-dive
- `/api/docs` — live Swagger UI (when running)

---

## Demo Account

```
Email:    demo@example.com
Password: password
```

---

## License

MIT
