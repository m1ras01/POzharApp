@echo off
cd /d "%~dp0"
echo FireNotify Frontend - installing deps...
call npm install
if errorlevel 1 (
  echo npm install failed. Check internet and npm cache.
  pause
  exit /b 1
)
echo Starting dev server...
call npm run dev
pause
