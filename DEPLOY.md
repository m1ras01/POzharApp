# Развёртывание FireNotify на сервер

На сервере один процесс (Node.js) отдаёт и API, и фронтенд.

**Полный гайд с нуля (какой сервер купить, как залить репозиторий, база, сайт, Telegram):** см. файл **ДЕПЛОЙ_С_НУЛЯ.md**.

---

## 1. Что нужно на сервере

- **Node.js** 18 или новее
- Папка для приложения (например `/var/www/firenotify` или `C:\app\firenotify`)

## 2. Подготовка проекта (можно сделать на ПК, потом залить)

### Вариант А: одной командой из корня проекта

```bash
npm run build:deploy
```

Эта команда:
1. Собирает фронтенд в `frontend/dist`
2. Копирует содержимое в `backend/public` (скрипт `scripts/copy-frontend.js`)
3. Собирает бэкенд в `backend/dist`

### Вариант Б: вручную

```bash
# Фронтенд
cd frontend
npm install
npm run build

# Копируем сборку в бэкенд
# Windows (из корня проекта):
xcopy /E /I /Y frontend\dist backend\public

# Linux/Mac (из корня проекта):
mkdir -p backend/public && cp -r frontend/dist/* backend/public/

# Бэкенд
cd backend
npm install
npm run build
```

## 3. Файлы на сервере

На сервер должны попасть:

- `backend/dist/` — папка со сборкой
- `backend/public/` — папка с фронтендом (из шага выше)
- `backend/node_modules/` — зависимости (`npm install --production` в backend)
- `backend/prisma/` — схема и миграции
- `backend/package.json`, `backend/package-lock.json`
- Файл **`.env`** в папке backend (см. ниже)

Папки `frontend/`, `backend/src/` на сервер для запуска не обязательны (нужны только если будете править код там).

## 4. Файл .env на сервере

В папке **backend** создайте файл `.env`:

```env
PORT=3000
JWT_SECRET=придумайте_длинный_секретный_ключ
ADMIN_LOGIN=ваш_логин_админа
ADMIN_PASSWORD=надёжный_пароль_не_короче_10_символов
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
```

- **PORT** — порт, на котором будет работать приложение (например 3000 или 80).
- **JWT_SECRET** — случайная длинная строка для подписи токенов.
- **ADMIN_LOGIN** и **ADMIN_PASSWORD** — логин и пароль первого администратора (создаются при `npx prisma db seed`). Если не задать ADMIN_PASSWORD, при seed будет сгенерирован случайный пароль (выведен в консоль один раз).
- **TELEGRAM_BOT_TOKEN** — если не укажете, бот Telegram просто не запустится, остальное будет работать.

Для SQLite база будет в `backend/prisma/dev.db`. Папку `backend/prisma` и файл `dev.db` нужно сохранять при обновлениях.

## 5. База данных при первом запуске

Один раз на сервере в папке **backend** выполните:

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

После этого будет создана база и пользователь-администратор. Логин и пароль берутся из `.env` (ADMIN_LOGIN, ADMIN_PASSWORD). Если ADMIN_PASSWORD не задан — при выполнении seed в консоль будет выведен одноразовый сгенерированный пароль (сохраните его).

## 6. Запуск

В папке **backend**:

```bash
node dist/index.js
```

Или с указанием порта:

```bash
PORT=3000 node dist/index.js
```

Сайт будет доступен по адресу: `http://IP_СЕРВЕРА:3000` (или без порта, если PORT=80 и запуск от root/с пробросом порта).

## 7. Запуск в фоне (Linux)

Через **PM2**:

```bash
npm install -g pm2
cd backend
pm2 start dist/index.js --name firenotify
pm2 save
pm2 startup
```

Через **systemd**: создайте юнит с запуском `node /путь/к/backend/dist/index.js`.

## 8. Nginx (по желанию)

Чтобы отдавать приложение по 80 порту и при необходимости добавить HTTPS:

```nginx
server {
    listen 80;
    server_name ваш-домен.ru;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Порт 3000 замените на тот, что указан в `.env` (PORT).

## 9. Обновление на сервере

После изменений в коде:

1. Снова выполните `npm run build:deploy` (или шаги из варианта Б).
2. Залить на сервер обновлённые папки `backend/dist` и `backend/public`.
3. Перезапустить процесс: `pm2 restart firenotify` или перезапуск systemd/ручной запуск.

Базу (prisma и dev.db) при обновлении не трогайте, если не меняли схему. Если меняли — на сервере в backend выполните `npx prisma db push`.
