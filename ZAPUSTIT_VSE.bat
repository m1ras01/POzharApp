@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   FireNotify - avtomaticheskiy zapusk
echo ============================================
echo.

echo [1/4] Osvobozhdaem porty 3001, 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo Gotovo.
echo.

echo [2/4] Ustanovka zavisimostey backend (telegraf i dr.)...
cd backend
call npm install
if errorlevel 1 (
  echo Vnimanie: npm install oshibka. Bot Telegram mozhet ne rabotat.
  echo Ostalnoe zapustitsya.
) else (
  echo Gotovo.
)
call npx prisma generate
cd ..
echo.

echo [3/4] Ustanovka zavisimostey v korne proekta...
if not exist "node_modules" (
  call npm install
  echo Gotovo.
) else (
  echo Uzhe ustanovleno.
)
echo.

echo [4/4] Zapusk backend + frontend...
echo.
echo   Brauzer: http://localhost:5173
echo   Login:   admin
echo   Parol:   admin123
echo.
echo Ne zakryvayte eto okno. Dlya ostanovki nazhmite Ctrl+C.
echo ============================================
echo.

call npm run dev

pause
