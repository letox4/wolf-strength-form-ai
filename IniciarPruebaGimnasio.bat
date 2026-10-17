@echo off
title Wolf Strength - Prueba Gimnasio (Beta v3)
cd /d "%~dp0"
echo ============================================================
echo   WOLF STRENGTH - PRUEBA GIMNASIO (Beta v3)
echo ============================================================
echo.

if exist venv\Scripts\activate.bat (
  call venv\Scripts\activate.bat
) else if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
)

echo [1/2] Calibrando ejercicios desde EntrenamientoVideos (si hace falta)...
python tools\calibrate_from_videos.py --device cuda 2>nul
if errorlevel 1 (
  echo      GPU no disponible, calibrando en CPU (mas lento)...
  python tools\calibrate_from_videos.py --device cpu
)

echo.
echo [2/2] Arrancando servidor web...
echo.
echo  En ESTE PC:     http://localhost:8000
echo  En el MOVIL:    http://IP-DE-ESTE-PC:8000
echo                  (misma WiFi, camara trasera recomendada)
echo.
echo  Pulsa Ctrl+C para detener.
echo ============================================================
python run_web.py --no-tunnel --port 8000
pause
