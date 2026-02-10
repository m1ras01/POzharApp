@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   Исправление базы данных (добавление недостающих колонок)
echo.
cd backend

echo Выполняю: prisma db push...
call npx prisma db push
if errorlevel 1 (
  echo.
  echo ОШИБКА при db push. Проверьте, что папка backend доступна.
  pause
  exit /b 1
)

echo.
echo Выполняю: prisma generate...
call npx prisma generate

cd ..
echo.
echo   Готово. Теперь запустите "Запустить всё.bat"
echo.
pause
