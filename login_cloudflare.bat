@echo off
title Cloudflare Login
cd /d "%~dp0backend"
echo ========================================================
echo   Logging into Cloudflare...
echo   A browser tab will open automatically.
echo   Please click "Allow" to authorize Wrangler.
echo ========================================================
echo.
npx wrangler login
echo.
pause
