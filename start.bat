@echo off
title PureScale 4K - Video Enhancer ^& Upscaler
echo ========================================================
echo   PureScale 4K - Non-AI Video Enhancer ^& Upscaler
echo   100%% Free, Local, Offline ^& Unlimited
echo ========================================================
echo.

where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] FFmpeg is not found in your system PATH.
    echo Please ensure FFmpeg is installed and added to PATH.
    pause
    exit /b 1
)

echo [1/2] Checking Python dependencies...
python -m pip install -r requirements.txt --quiet

echo [2/2] Starting local web server...
echo.
echo Opening http://localhost:5000 in your browser...
start http://localhost:5000
python app.py
pause
