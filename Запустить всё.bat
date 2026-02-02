@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   FireNotify — запуск всего
echo.
echo Освобождаю порты 3001 и 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo Готово.
echo.

if not exist "backend\node_modules" (
  echo Устанавливаю зависимости backend...
  cd backend
  call npm install
  cd ..
  echo.
)

if not exist "frontend\node_modules" (
  echo Устанавливаю зависимости frontend...
  cd frontend
  call npm install
  cd ..
  echo.
)

if not exist "node_modules" (
  echo Устанавливаю зависимости в корне...
  call npm install
  echo.
)

echo Запускаю backend и frontend...
echo.
echo   Сайт:    http://localhost:5173
echo   Логин:   admin
echo   Пароль:  admin123
echo.
echo Не закрывайте это окно. Остановка: Ctrl+C
echo.

call npm run dev

pause
