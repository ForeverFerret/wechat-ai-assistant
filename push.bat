@echo off
title Push WeChat AI Assistant to GitHub
cd /d "%~dp0"
echo ========================================================
echo   Pushing code to https://github.com/ForeverFerret/wechat-ai-assistant.git
echo ========================================================
echo.
echo If a GitHub login window or browser tab appears, please authorize.
echo.
git push -u origin main --force

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   SUCCESS! Pushed to GitHub successfully!
    echo ========================================================
) else (
    echo ========================================================
    echo   Push failed. Please check your network or credentials.
    echo ========================================================
)
echo.
pause
