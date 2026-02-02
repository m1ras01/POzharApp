@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo FireNotify Backend (с Telegram-ботом)
echo.
echo Установка зависимостей (telegraf и др.)...
call npm install
if errorlevel 1 (
  echo Ошибка npm install. Запуск без бота...
) else (
  echo Готово.
)
echo.
echo Запуск API и бота...
call npm run dev
pause
