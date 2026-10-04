# 微信AI助手 - PowerShell 启动脚本
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         微信AI助手 - 一键启动脚本" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/2] 正在启动后端服务 (端口 8787)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$scriptDir\backend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[2/2] 正在启动前端界面 (端口 5173)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$scriptDir\frontend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "启动完成！正在打开浏览器: http://localhost:5173" -ForegroundColor Green
Start-Process "http://localhost:5173"
