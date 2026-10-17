@echo off
title Wolf Strength - Guia 3D
cd /d "%~dp0"

REM Resolver Python: venv > .venv > py -3 > python
set "PY=python"
if exist "venv\Scripts\python.exe" set "PY=venv\Scripts\python.exe"
if exist ".venv\Scripts\python.exe" set "PY=.venv\Scripts\python.exe"

"%PY%" --version >nul 2>&1
if errorlevel 1 set "PY=py -3"

%PY% --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python no encontrado.
  echo.
  echo Instala Python desde https://www.python.org/downloads/
  echo Marca "Add python.exe to PATH" durante la instalacion.
  echo O ejecuta en esta carpeta: py -3 -m pip install fastapi uvicorn pyngrok
  pause
  exit /b 1
)

echo ============================================================
echo   WOLF STRENGTH - BIBLIOTECA 3D DE EJERCICIOS
echo ============================================================
echo.

if not exist "web\static\vendor\three\build\three.module.js" (
  echo [ERROR] Falta Three.js local. Ejecuta: %PY% tools\download_assets.py
  pause
  exit /b 1
)
if not exist "web\static\vendor\mannequin-js\mannequin.js" (
  echo [ERROR] Falta mannequin.js en web\static\vendor\mannequin-js\
  pause
  exit /b 1
)

echo  Abriendo navegador en 3 segundos...
echo  URL local:   http://localhost:8000
echo  Si no carga: Ctrl+F5 en el navegador
echo.
echo  ENLACE PUBLICO (para tu colega desde cualquier dispositivo):
echo  Aparecera abajo como "ACCESO PUBLICO" con una URL https://...ngrok...
echo  Copiala y pasasela. Requiere NGROK_AUTHTOKEN configurado.
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8000/?v=82"

%PY% run_web.py --port 8000
pause
