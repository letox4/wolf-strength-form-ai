@echo off
title Wolf Strength - Lanzador
cd /d "%~dp0"
if exist venv\Scripts\activate.bat call venv\Scripts\activate.bat

echo ====================================================
echo    WOLF STRENGTH - Form AI
echo ====================================================
echo Iniciando el servidor (la IA corre en TU GPU)...
start "Wolf Server" /min cmd /c "python run_web.py --no-tunnel --port 80"

echo Esperando a que cargue el modelo en la GPU...
timeout /t 7 /nobreak >nul

echo.
echo Abriendo el tunel ngrok. Tu URL https aparece abajo (Forwarding).
echo  - Para cerrar SOLO el tunel: cierra esta ventana o Ctrl+C
echo  - Para APAGAR TODO (IA + tunel): usa DetenerWolf.bat
echo ----------------------------------------------------
ngrok http 80
