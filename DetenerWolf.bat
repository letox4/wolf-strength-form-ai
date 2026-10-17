@echo off
title Wolf Strength - Apagar
echo Deteniendo Wolf Strength (IA + tunel)...

REM Cierra el tunel ngrok
taskkill /IM ngrok.exe /F >nul 2>&1

REM Cierra el servidor (proceso que escucha en el puerto 80)
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"

echo.
echo Listo: la IA ya NO corre en tu PC y el tunel esta cerrado.
timeout /t 3 >nul
