# PureScale 4K PowerShell Launcher
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  PureScale 4K - Non-AI Video Enhancer & Upscaler" -ForegroundColor Green
Write-Host "  100% Free, Local, Offline & Unlimited" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] FFmpeg not found in PATH. Please install FFmpeg." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/2] Verifying Python dependencies..." -ForegroundColor Gray
python -m pip install -r requirements.txt --quiet

Write-Host "[2/2] Launching server on http://localhost:5000..." -ForegroundColor Green
Start-Process "http://localhost:5000"
python app.py
