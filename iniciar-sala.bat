@echo off
chcp 65001 >nul
title SALA SENA - Backend + Tunel Cloudflare
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-sala.ps1" %*
echo.
pause
