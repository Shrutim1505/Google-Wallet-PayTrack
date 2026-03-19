# Backend API (Local Integration)

This backend is a lightweight Node HTTP API for local integration with the frontend.

## Run

```bash
npm run backend
```

Server starts on `http://localhost:5000` by default.

## Environment

- `PORT` (default: `5000`)
- `JWT_SECRET` (default: `dev-secret`)

## Auth

Use demo credentials:

- email: `demo@example.com`
- password: `password`

`POST /api/auth/login` returns `{ data: { user, token } }`.
Use `Authorization: Bearer <token>` for protected routes.

## Endpoints

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/receipts`
- `GET /api/receipts/:id`
- `POST /api/receipts`
- `PUT /api/receipts/:id`
- `DELETE /api/receipts/:id`
- `POST /api/receipts/upload` (multipart form field name: `file`)
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/analytics`
- `GET /health`

Data is stored in JSON files under `backend/data/`.
