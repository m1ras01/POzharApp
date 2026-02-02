import path from 'path';
import fs from 'fs';
import { prisma } from './prisma.js';

/** Отправить уведомление о новом пожарном сигнале всем админам с включённым Telegram. */
export async function notifyTelegramNewNotification(notification: {
  id: string;
  source: string;
  address: string;
  description?: string | null;
  department?: string | null;
}) {
  let sendTelegramMessage: (chatId: string, text: string) => Promise<boolean>;
  let isTelegramEnabled: () => boolean;
  try {
    const bot = await import('../telegram/bot.js');
    sendTelegramMessage = bot.sendTelegramMessage;
    isTelegramEnabled = bot.isTelegramEnabled;
  } catch {
    return; // telegraf не установлен
  }
  if (!isTelegramEnabled()) return;
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      telegramEnabled: true,
      telegramId: { not: null },
    },
    select: { telegramId: true },
  });
  const text =
    `🔥 <b>Новое пожарное уведомление</b>\n` +
    `Источник: ${escapeHtml(notification.source)}\n` +
    `Адрес: ${escapeHtml(notification.address)}\n` +
    (notification.department ? `Отделение: ${escapeHtml(notification.department)}\n` : '') +
    (notification.description ? `Описание: ${escapeHtml(notification.description)}\n` : '');
  for (const u of admins) {
    if (u.telegramId) await sendTelegramMessage(u.telegramId, text);
  }
}

/** Уведомить получателя (админа) в Telegram о новой заявке от оператора. Если есть вложение — отправляет файл с подписью. */
export async function notifyTelegramNewMessage(
  message: {
    workObject?: string | null;
    subject: string | null;
    body: string;
    attachmentUrl?: string | null;
  },
  senderName: string,
  recipientTelegramId: string
): Promise<void> {
  let sendTelegramMessage: (chatId: string, text: string) => Promise<boolean>;
  let sendTelegramFile: (
    chatId: string,
    localFilePath: string,
    caption: string,
    isDocument: boolean
  ) => Promise<boolean>;
  try {
    const bot = await import('../telegram/bot.js');
    sendTelegramMessage = bot.sendTelegramMessage;
    sendTelegramFile = bot.sendTelegramFile;
  } catch {
    return;
  }
  const subject = message.subject ? escapeHtml(message.subject) : '(без темы)';
  const body = escapeHtml(message.body).slice(0, 500);
  const objectLine = message.workObject
    ? `Объект: ${escapeHtml(message.workObject)}\n`
    : '';
  const text =
    `📩 <b>Новая заявка в FireNotify</b>\n` +
    `От: ${escapeHtml(senderName)}\n` +
    (objectLine ? objectLine : '') +
    `Тема: ${subject}\n\n` +
    body;

  const attachmentPath =
    message.attachmentUrl && message.attachmentUrl.trim()
      ? path.join(process.cwd(), message.attachmentUrl.replace(/^\//, ''))
      : '';

  if (attachmentPath && fs.existsSync(attachmentPath)) {
    const ext = path.extname(attachmentPath).toLowerCase();
    const isDocument = ext === '.pdf';
    await sendTelegramFile(recipientTelegramId, attachmentPath, text, isDocument);
  } else {
    await sendTelegramMessage(recipientTelegramId, text);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
