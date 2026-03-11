@echo off
title Vanguard Platform Local Environment
echo =======================================
echo Vanguard System Startup Sequence
echo =======================================
echo.
echo Starting Backend API Services...
start "Vanguard Backend" cmd /c "%~dp0start-backend.bat"

echo.
echo Starting Frontend React/Vite Dev Server...
start "Vanguard Frontend" cmd /c "%~dp0start-frontend.bat"

echo.
echo =======================================
echo SUCCESS: Both servers have been launched in separate terminal windows.
echo - Backend is running on port 3333
echo - Frontend is running on http://localhost:5173
echo =======================================
echo.
echo You can safely close this orchestrator window. The servers will continue running in their own windows.
pause
