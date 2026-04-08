# PayTrack - Smart Receipt Management System

A modern full-stack web application for managing receipts, categorizing expenses, tracking spending patterns, and analyzing financial data with real-time charts and budget alerts.

## Quick Start

### Prerequisites
- Node.js 16+ and npm

### Start All Services
```bash
npm run dev
```

**Frontend:** http://localhost:5173  
**Backend API:** http://localhost:5000

### Manual Startup
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2 (new terminal)
cd frontend && npm run dev
```

---

## Project Structure

### Frontend (`/frontend`)
React application with TypeScript, Vite, and Tailwind CSS.
- **components/** - React UI components (layouts, features, common)
- **hooks/** - Custom React hooks (useAuth, useReceipts, useSettings)
- **services/** - API communication layer (Axios HTTP client)
- **types/** - TypeScript interfaces
- **context/** - Global state management
- **utils/** - Helper functions
- **lib/** - Library utilities (JWT)

### Backend (`/backend`)
Express API server with TypeScript and SQLite.
- **controllers/** - Request handlers for each route
- **services/** - Business logic layer
- **routes/** - API endpoint definitions
- **middleware/** - Auth, validation, error handling
- **config/** - Database and environment setup
- **types/** - TypeScript interfaces
- **utils/** - Helper functions and constants

---

## Architecture

```
Frontend (React)                 Backend (Express)              Database (SQLite)
    ↓                                ↓                              ↓
• Components                    • Controllers              • users table
• Custom Hooks                  • Services                 • receipts table
• API Client                    • Middleware               • budgets table
   (Axios)                      • Routes                   • user_settings
    ↓                                ↓                              ↓
--------- HTTP/JSON --------- /api/auth, /receipts, etc ------- SQL --------
```

---

## API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `GET /verify` - Verify JWT token

### Receipts (`/api/receipts`)
- `GET /` - Get all receipts
- `POST /` - Upload receipt
- `GET /:id` - Get receipt details
- `PUT /:id` - Update receipt
- `DELETE /:id` - Delete receipt

### Analytics (`/api/analytics`)
- `GET /summary` - Get spending analytics

### Settings (`/api/settings`)
- `GET /` - Get user settings
- `PUT /` - Update settings

---

## Key Technologies

**Frontend:**
- React 18.2, TypeScript, Vite 5, Tailwind CSS, Axios

**Backend:**
- Express.js, TypeScript, SQLite3, JWT, Bcryptjs, Helmet, CORS

---

## Features

- User authentication with JWT
- Receipt upload and management
- Automatic receipt categorization
- Spending analytics with charts
- Budget tracking with alerts
- Real-time notifications
- Responsive UI design
- Search and filter functionality

---

## Available Commands

```bash
# Root
npm run dev              # Start both servers
npm run dev:frontend    # Frontend only
npm run dev:backend     # Backend only
npm run build           # Build both

# Frontend
cd frontend && npm run dev    # Dev server
cd frontend && npm run build  # Production build

# Backend
cd backend && npm run dev     # Dev with hot reload
cd backend && npm run build   # Compile TypeScript
cd backend && npm start       # Run compiled code
```

---

## Database Schema

**users:** id, email, name, passwordhash, currency, timezone, createdAt, updatedAt

**receipts:** id, userId, merchant, amount, category, date, imageUrl, notes, ocrData, createdAt, updatedAt

**budgets:** id, userId, category, amount, period, alertEnabled, alertThreshold

**user_settings:** userId, monthlyBudget, notificationsEnabled, darkMode

---

## Environment Variables

### Frontend (`.env.local`)
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Backend (`.env.local`)
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your_secret_key
DATABASE_PATH=./data/paytrack.sqlite
```

---

## Demo Account

Email: `demo@example.com`  
Password: `password`

---

## Development Features

- Hot reload on file changes
- TypeScript for type safety
- Global error handling
- Request validation with Joi
- Rate limiting
- CORS support
- Comprehensive logging

---

## Data Flow Example

1. User uploads receipt image from frontend
2. Axios POST to `/api/receipts` (proxied to backend)
3. Middleware validates JWT token
4. Controller receives request
5. Service processes receipt (saves, categorizes, calculates budget impact)
6. Returns receipt data to frontend
7. React component re-renders with new receipt
8. Toast notification shows success

---

## Security

- JWT authentication for API calls
- Bcryptjs password hashing
- HTTP security headers (Helmet)
- CORS protection
- Input validation
- SQL parameter binding
- Rate limiting

---

## Production Deployment

### Frontend Build
```bash
cd frontend && npm run build
# Deploy dist/ folder to: Vercel, Netlify, AWS S3, GitHub Pages
```

### Backend Build
```bash
cd backend && npm run build
# Deploy to: Heroku, Railway, AWS EC2, DigitalOcean, Render
```

---

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Dependencies Issue
```bash
npm cache clean --force
cd frontend && npm install
cd ../backend && npm install
```

---

## Project Status

✅ Production Ready - Clean, organized, and fully functional

---

## License

MIT License

---

**Ready to develop? Start with `npm run dev` and open http://localhost:5173** 🚀