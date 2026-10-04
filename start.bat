@echo off
title WeChat AI Assistant Launcher
cls
echo ========================================================
echo         WeChat AI Assistant - One-Click Launcher
echo ========================================================
echo.

echo [1/2] Starting Backend Service on http://127.0.0.1:8787 ...
start "WeChat-AI-Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 >nul

echo [2/2] Starting Frontend UI on http://localhost:5173 ...
start "WeChat-AI-Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 2 >nul

echo.
echo ========================================================
echo   Services are running! Opening browser...
echo   URL: http://localhost:5173
echo ========================================================
start http://localhost:5173
