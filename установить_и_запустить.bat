@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo FireNotify — установка и запуск
echo ========================================
echo.

echo [1/2] Установка зависимостей в backend (telegraf и др.)...
cd backend
call npm install
if errorlevel 1 (
  echo.
  echo Ошибка npm install. Проверьте интернет и настройки npm.
  echo Если npm в режиме offline: npm config set prefer-offline false
  pause
  exit /b 1
)
cd ..
echo Готово.
echo.

echo [2/2] Запуск backend + frontend...
echo Откройте в браузере: http://localhost:5173
echo Логин: admin  Пароль: admin123
echo.
call npm run dev

pause
