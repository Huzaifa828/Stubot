@echo off
echo ========================================================
echo   Starting SSUET Agent, WhatsApp Bot ^& React Dashboard
echo ========================================================

echo 1. Starting Baileys WhatsApp Microservice (Port 3000)...
start "WhatsApp Baileys Service" /min cmd /k "cd whatsapp_service && node index.js"

echo 2. Starting FastAPI Backend (Port 8000)...
start "FastAPI Server" /min cmd /k "uvicorn app_routes:app --reload --port 8000"

echo 3. Starting React Web Application (Port 5173)...
start "React Dashboard" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched in background!
echo - React Web App: http://localhost:5173
echo - FastAPI Backend: http://localhost:8000
echo - WhatsApp Microservice: http://localhost:3000
echo ========================================================
