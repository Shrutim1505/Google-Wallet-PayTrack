@echo off
REM Start PayTrack - Backend and Frontend
REM This script opens both servers in separate windows

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Starting PayTrack Application                      ║
echo ║                                                            ║
echo ║  Backend will run on:  http://localhost:5000             ║
echo ║  Frontend will run on: http://localhost:5173             ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Start Backend in new window
echo [1/2] Starting Backend Server...
start cmd /k "cd backend && npm run dev"

REM Wait a bit for backend to start
timeout /t 3 /nobreak

REM Start Frontend in new window
echo [2/2] Starting Frontend Server...
start cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both servers are starting!
echo.
echo Waiting for servers to boot up...
timeout /t 5 /nobreak

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  📝 Server Status:                                          ║
echo ║  - Backend API: http://localhost:5000                     ║
echo ║  - Frontend UI: http://localhost:5173                     ║
echo ║                                                            ║
echo ║  Opening browser in 3 seconds...                           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

timeout /t 3 /nobreak

REM Open browser to frontend
start http://localhost:5173

echo.
echo ✨ PayTrack is ready! Check your browser.
echo.
