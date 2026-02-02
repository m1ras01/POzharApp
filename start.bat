@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo FireNotify - zapusk backend i frontend
echo.
echo Osvobozhdaem port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo.
if not exist "node_modules" (
  echo Ustanovka zavisimostey v korne...
  call npm install
)
echo Zapusk: backend + frontend
echo Brauzer: http://localhost:5173
echo Login: admin  Parol: admin123
echo.
call npm run dev
pause
