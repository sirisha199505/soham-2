@echo off
title RoboQuiz Dev Servers
echo Starting RoboQuiz Backend + Frontend...
echo.

:: Start backend in a new window
start "RoboQuiz API (port 3001)" cmd /k "cd /d "%~dp0backend" && node server.js"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
start "RoboQuiz Frontend (port 5173)" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Both servers started!
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
pause
