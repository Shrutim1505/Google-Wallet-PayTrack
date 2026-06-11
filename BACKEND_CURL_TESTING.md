# PayTrack Backend - cURL Testing Guide

## Prerequisites
- Backend running on `http://localhost:5000`
- Replace `{token}` with actual JWT token received from login
- Replace placeholders like `{user-email}`, `{user-password}`, etc.

---

## 1. AUTHENTICATION ENDPOINTS

### Register New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpass123",
    "name": "Test User"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid-123",
      "email": "testuser@example.com",
      "name": "Test User"
    },
    "token": "eyJhbGc..."
  }
}
```

---

### Login User (Get Token)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "password"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "demo@example.com",
      "name": "Demo User"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ IMPORTANT:** Copy this token! You'll use it for all other requests.

---

## 2. RECEIPT ENDPOINTS (All require JWT token)

### Create Receipt (Manual Entry)
```bash
curl -X POST http://localhost:5000/api/receipts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "merchant": "ABC Restaurant",
    "amount": 500,
    "date": "2024-03-19",
    "category": "Food",
    "items": [
      {
        "name": "Biryani",
        "quantity": 1,
        "price": 300
      }
    ],
    "notes": "Great food",
    "currency": "INR"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Receipt created successfully",
  "data": {
    "id": "receipt-uuid",
    "merchant": "ABC Restaurant",
    "amount": 500,
    "date": "2024-03-19",
    "category": "Food",
    "items": []
  }
}
```

---

### Upload Receipt with Image (OCR)
```bash
curl -X POST http://localhost:5000/api/receipts/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -F "file=@/path/to/receipt.jpg" \
  -F "notes=Grocery shopping"
```

**File Requirements:**
- Supported: JPEG, PNG, PDF
- Max size: 10MB
- Replace `/path/to/receipt.jpg` with actual file path

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Receipt processed successfully",
  "data": {
    "id": "receipt-uuid",
    "merchant": "XYZ Store",
    "amount": 1500,
    "date": "2024-03-19",
    "category": "Shopping",
    "items": [
      {
        "name": "Item 1",
        "price": 500,
        "quantity": 1
      }
    ]
  }
}
```

---

### Get All Receipts (Paginated)
```bash
curl -X GET "http://localhost:5000/api/receipts?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Receipts retrieved successfully",
  "data": [
    {
      "id": "receipt-uuid-1",
      "merchant": "Restaurant A",
      "amount": 500,
      "date": "2024-03-19",
      "category": "Food"
    },
    {
      "id": "receipt-uuid-2",
      "merchant": "Store B",
      "amount": 1500,
      "date": "2024-03-18",
      "category": "Shopping"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "hasMore": true
  }
}
```

---

### Get Single Receipt
```bash
curl -X GET http://localhost:5000/api/receipts/RECEIPT_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "receipt-uuid",
    "merchant": "ABC Restaurant",
    "amount": 500,
    "date": "2024-03-19",
    "category": "Food",
    "items": [],
    "notes": "Great food",
    "createdAt": "2024-03-19T10:00:00Z"
  }
}
```

---

### Update Receipt
```bash
curl -X PUT http://localhost:5000/api/receipts/RECEIPT_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "merchant": "Updated Restaurant Name",
    "amount": 600,
    "category": "Dining",
    "notes": "Updated notes"
  }'
```

**Expected Response (200):** Updated receipt object

---

### Delete Receipt
```bash
curl -X DELETE http://localhost:5000/api/receipts/RECEIPT_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Receipt deleted successfully"
}
```

---

## 3. ANALYTICS ENDPOINT

### Get Spending Analytics
```bash
curl -X GET "http://localhost:5000/api/analytics?year=2024&month=3" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Query Parameters (optional):**
- `year` (default: current year)
- `month` (default: current month)

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Analytics data retrieved successfully",
  "data": {
    "allTime": {
      "totalSpent": 15000,
      "receiptsCount": 12,
      "categories": [
        {
          "category": "Food",
          "amount": 5000
        },
        {
          "category": "Transport",
          "amount": 2000
        }
      ]
    },
    "monthly": {
      "year": 2024,
      "month": 3,
      "totalSpent": 3500,
      "receiptsCount": 5,
      "categories": [
        {
          "category": "Food",
          "amount": 2000
        }
      ]
    }
  }
}
```

---

## 4. SETTINGS ENDPOINT

### Get User Settings
```bash
curl -X GET http://localhost:5000/api/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Settings retrieved successfully",
  "data": {
    "settings": {
      "name": "Demo User",
      "email": "demo@example.com",
      "monthlyBudget": 50000,
      "notificationsEnabled": true,
      "darkMode": false
    }
  }
}
```

---

### Update User Settings
```bash
curl -X PUT http://localhost:5000/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "Updated Name",
    "monthlyBudget": 75000,
    "notificationsEnabled": false,
    "darkMode": true
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "settings": {
      "name": "Updated Name",
      "email": "demo@example.com",
      "monthlyBudget": 75000,
      "notificationsEnabled": false,
      "darkMode": true
    }
  }
}
```

---

## 5. UTILITY ENDPOINTS

### Health Check
```bash
curl -X GET http://localhost:5000/health
```

**Expected Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-03-19T10:00:00Z"
}
```

---

## QUICK TEST WORKFLOW

Follow this sequence to test the complete flow:

1. **Register/Login** to get JWT token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password"}'
```

2. **Copy the token** from response

3. **Create a receipt** (replace TOKEN with actual token)
```bash
curl -X POST http://localhost:5000/api/receipts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"merchant":"Test Store","amount":100,"date":"2024-03-19","category":"Shopping"}'
```

4. **Get all receipts**
```bash
curl -X GET http://localhost:5000/api/receipts \
  -H "Authorization: Bearer TOKEN"
```

5. **Get analytics**
```bash
curl -X GET http://localhost:5000/api/analytics \
  -H "Authorization: Bearer TOKEN"
```

6. **Get settings**
```bash
curl -X GET http://localhost:5000/api/settings \
  -H "Authorization: Bearer TOKEN"
```

---

## ERROR RESPONSES

### 401 Unauthorized (Invalid/Missing Token)
```json
{
  "success": false,
  "error": "Invalid or missing authorization token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Receipt not found"
}
```

### 422 Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  }
}
```

### 429 Rate Limited
```json
{
  "success": false,
  "error": "Too many requests. Please try again later"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "timestamp": "2024-03-19T10:00:00Z"
}
```

---

## USEFUL TIPS

### Using jq to Format Output (Linux/Mac)
```bash
curl -X GET http://localhost:5000/api/receipts \
  -H "Authorization: Bearer TOKEN" | jq .
```

### Saving Token to Variable (Bash)
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password"}' | jq -r '.data.token')

echo $TOKEN
```

### Using Saved Token
```bash
curl -X GET http://localhost:5000/api/receipts \
  -H "Authorization: Bearer $TOKEN"
```

### Testing with Windows PowerShell
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"demo@example.com","password":"password"}'

$response.Content | ConvertFrom-Json
```

---

## DEMO ACCOUNT (Pre-created)
```
Email: demo@example.com
Password: password
```

Use this account to test without registering a new user.

---

## RATE LIMITS

- **General API**: 100 requests per 15 minutes
- **Auth (Login/Register)**: 5 attempts per 15 minutes
- **File Upload**: 20 uploads per hour

If you exceed limits, you'll get a **429 Too Many Requests** response.

---

## CHECKLIST FOR BACKEND VERIFICATION

- [ ] `/health` returns 200
- [ ] Register new user works
- [ ] Login returns JWT token
- [ ] Create receipt works with token
- [ ] Get receipts returns paginated list
- [ ] Update receipt works
- [ ] Delete receipt works
- [ ] Get analytics shows spending data
- [ ] Get settings returns user config
- [ ] Update settings works
- [ ] Invalid token returns 401
- [ ] Missing required fields return 422
- [ ] Rate limits work (get 429 after limit)

---

All endpoints tested? Your backend is working! ✅
