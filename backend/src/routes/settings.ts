import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { logAction } from '../lib/logAction.js';

const router = Router();

// Настройки уведомлений (только Telegram)
router.get('/notifications', async (req, res) => {
  const user = (req as any).user;
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { telegramEnabled: true, telegramId: true },
  });
  if (!u) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }
  res.json(u);
});

router.patch('/notifications', async (req, res) => {
  const user = (req as any).user;
  const { telegramEnabled } = req.body;
  const data: any = {};
  if (telegramEnabled !== undefined) data.telegramEnabled = telegramEnabled;
  const u = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { telegramEnabled: true, telegramId: true },
  });
  await logAction(user.id, 'UPDATE_SETTINGS_NOTIFICATIONS');
  res.json(u);
});

// Ссылка на бота (для всех ролей — оператор может открыть бота)
router.get('/telegram/bot-info', async (_req, res) => {
  let botUsername = '';
  let available = false;
  try {
    const bot = await import('../telegram/bot.js');
    botUsername = await bot.getTelegramBotUsername();
    available = bot.isTelegramEnabled();
  } catch {
    // бот не настроен
  }
  const clean = botUsername.replace(/^@/, '');
  res.json({
    available,
    botUsername: clean ? `@${clean}` : null,
    botLink: clean ? `https://t.me/${clean}` : null,
  });
});

// Запрос кода привязки Telegram
router.post('/telegram/request-code', async (req, res) => {
  const user = (req as any).user;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  await prisma.user.update({
    where: { id: user.id },
    data: { telegramCode: code },
  });
  let botUsername = '';
  let telegramConfigured = false;
  try {
    const bot = await import('../telegram/bot.js');
    botUsername = await bot.getTelegramBotUsername();
    telegramConfigured = bot.isTelegramEnabled();
  } catch {
    // telegraf не установлен или бот не настроен
  }
  res.json({
    code,
    botUsername: botUsername ? `@${botUsername}` : null,
    telegramConfigured,
    message: telegramConfigured
      ? `Отправьте боту ${botUsername ? `@${botUsername}` : 'в Telegram'} команду: /start ${code}`
      : `Токен в .env есть, но бот не запущен. В папке backend выполните: npm install. Затем перезапустите backend (из корня: npm run dev). После перезапуска снова нажмите «Запросить код» и отправьте боту: /start ${code}`,
  });
});

// Отвязать Telegram
router.post('/telegram/unlink', async (req, res) => {
  const user = (req as any).user;
  await prisma.user.update({
    where: { id: user.id },
    data: { telegramId: null, telegramCode: null },
  });
  await logAction(user.id, 'TELEGRAM_UNLINK');
  res.json({ ok: true, message: 'Telegram отвязан' });
});

export { router as settingsRouter };
