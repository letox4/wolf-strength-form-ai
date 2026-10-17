@echo off
title Wolf Strength Form AI v2
cd /d "%~dp0"
if exist venv\Scripts\activate.bat call venv\Scripts\activate.bat

echo ====================================================
echo    WOLF STRENGTH - Form AI v2
echo ====================================================
echo.
echo  PC (webcam):  python main.py --exercise sentadilla
echo  Web local:    http://localhost:8000
echo.
python run_web.py --port 8000
pause
