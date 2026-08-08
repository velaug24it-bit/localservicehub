@echo off
echo ==================================================
echo   ServiceHub - Starting Development Servers
echo ==================================================
echo.

:: Kill anything on port 5000
echo [1/2] Clearing port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /PID %%a /F 2>nul
timeout /t 1 /nobreak >nul

:: Start Backend Server in new window
echo [2/2] Starting Backend Server (port 5000)...
start "ServiceHub Backend" cmd /k "cd /d d:\servicehub-connect\server && node server.js"

:: Small delay before starting frontend
timeout /t 2 /nobreak >nul

:: Start Frontend in new window  
echo [3/2] Starting Frontend Client (port 5173)...
start "ServiceHub Frontend" cmd /k "cd /d d:\servicehub-connect\client && npx vite"

echo.
echo ==================================================
echo   Both servers started in separate windows!
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo ==================================================
echo.
pause
