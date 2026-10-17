@echo off
REM Doble clic para arrancar el detector web + tunel ngrok
cd /d "%~dp0"
if exist venv\Scripts\activate.bat call venv\Scripts\activate.bat
python run_web.py %*
pause
