# PayTrack Backend - API Testing Guide

## Prerequisites

```bash
# PostgreSQL running locally
# Create database
createdb paytrack

# Install dependencies
cd backend && npm install

# Start server
DATABASE_URL="postgresql://localhost:5432/paytrack" npm run dev
```

## Run Automated Tests

```bash
# Unit + Integration tests (26 tests)
DATABASE_URL="postgresql://localhost:5432/paytrack_test" npm run test

# Performance benchmark (50k receipts, index comparison)
DATABASE_URL="postgresql://localhost:5432/paytrack" npm run benchmark
```

---

## API Endpoints (curl)

### Health Check

```bash
curl http://localhost:5000/health
```

---

### Authentication

#### Register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'
```

#### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password"}'
```

#### Verify Token

```bash
curl http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer <TOKEN>"
```

#### Refresh Token

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

#### Change Password

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"currentPassword":"password","newPassword":"newpass123"}'
```

#### Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

---

### Receipts (RBAC: requires `receipts:create/read/update/delete`)

#### Create Receipt

```bash
curl -X POST http://localhost:5000/api/receipts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "merchant": "Swiggy",
    "amount": 450.50,
    "date": "2024-12-15",
    "category": "Food",
    "items": [{"name": "Biryani", "quantity": 1, "price": 450.50}],
    "notes": "Dinner order"
  }'
```

#### Upload Receipt (OCR via Google Cloud Vision)

```bash
curl -X POST http://localhost:5000/api/receipts/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@receipt.jpg"
```

#### Get All Receipts (paginated + filters)

```bash
# Basic
curl http://localhost:5000/api/receipts \
  -H "Authorization: Bearer <TOKEN>"

# With filters
curl "http://localhost:5000/api/receipts?category=Food&startDate=2024-01-01&endDate=2024-12-31&minAmount=100&maxAmount=1000&search=swiggy&page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```

#### Get Single Receipt

```bash
curl http://localhost:5000/api/receipts/<RECEIPT_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

#### Update Receipt

```bash
curl -X PUT http://localhost:5000/api/receipts/<RECEIPT_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"merchant": "Zomato", "amount": 500, "category": "Food"}'
```

#### Delete Receipt

```bash
curl -X DELETE http://localhost:5000/api/receipts/<RECEIPT_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

#### Export Receipts

```bash
# JSON
curl http://localhost:5000/api/receipts/export \
  -H "Authorization: Bearer <TOKEN>"

# CSV
curl "http://localhost:5000/api/receipts/export?format=csv" \
  -H "Authorization: Bearer <TOKEN>"
```

---

### Analytics

```bash
curl http://localhost:5000/api/analytics/summary \
  -H "Authorization: Bearer <TOKEN>"
```

---

### Budgets

#### Create Budget

```bash
curl -X POST http://localhost:5000/api/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"category": "Food", "amount": 5000, "period": "monthly", "alertThreshold": 80}'
```

#### Get All Budgets

```bash
curl http://localhost:5000/api/budgets \
  -H "Authorization: Bearer <TOKEN>"
```

#### Get Budget Status (spending vs budget)

```bash
curl http://localhost:5000/api/budgets/status \
  -H "Authorization: Bearer <TOKEN>"
```

---

### Settings

#### Get Settings

```bash
curl http://localhost:5000/api/settings \
  -H "Authorization: Bearer <TOKEN>"
```

#### Update Settings

```bash
curl -X PUT http://localhost:5000/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"monthlyBudget": 60000, "notificationsEnabled": true, "darkMode": false}'
```

---

## RBAC Demonstration

Users are assigned roles on registration. The system has 3 roles:

| Role | Permissions |
|------|-------------|
| **admin** | Full access (CRUD all resources + user/role management) |
| **user** | CRUD own receipts, budgets, settings, view analytics |
| **viewer** | Read-only access to receipts, budgets, analytics, settings |

A `viewer` trying to create a receipt gets:

```bash
# Response: 403 Forbidden
{"success": false, "error": "Insufficient permissions"}
```

---

## Architecture Highlights

- **PostgreSQL** with connection pooling (max 20 connections)
- **JWT** access tokens (15min) + refresh tokens (7d) with rotation
- **RBAC** enforced at route level via `requirePermission()` middleware
- **ACID transactions** with `BEGIN/COMMIT/ROLLBACK`
- **Google Cloud Vision API** for OCR receipt parsing
- **Composite indexes** on (user_id, date), (user_id, category), (user_id, amount)
- **Rate limiting**: 100 req/15min (API), 5 req/15min (auth), 20 req/hr (uploads)
- **Input validation** with Joi schemas
- **Real-time** WebSocket notifications via Socket.IO

---

## Demo Account

```
Email: demo@example.com
Password: password
```
