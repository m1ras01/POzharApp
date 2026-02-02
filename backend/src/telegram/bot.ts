/**
 * Telegram-бот FireNotify без внешних зависимостей (только fetch + Telegram API).
 * Запускается если задан TELEGRAM_BOT_TOKEN в .env
 */
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const API = token ? `https://api.telegram.org/bot${token}` : '';
let botUsername = '';
let polling = false;

function isEnabled(): boolean {
  return !!token;
}

async function api(method: string, body?: Record<string, unknown>): Promise<any> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}/${method}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return data?.ok ? data : null;
  } catch (e) {
    console.error('[Telegram] API error:', e);
    return null;
  }
}

/** Отправить фото или документ в чат (файл на диске). caption — подпись к сообщению. */
export async function sendTelegramFile(
  chatId: string,
  localFilePath: string,
  caption: string,
  isDocument: boolean
): Promise<boolean> {
  if (!API || !token) return false;
  const absolutePath = path.isAbsolute(localFilePath)
    ? localFilePath
    : path.join(process.cwd(), localFilePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    console.error('[Telegram] File not found:', absolutePath);
    return false;
  }
  const buffer = fs.readFileSync(absolutePath);
  const filename = path.basename(absolutePath);
  const ext = path.extname(filename).toLowerCase();
  const isPdf = ext === '.pdf';
  const fieldName = isDocument || isPdf ? 'document' : 'photo';

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption.slice(0, 1024));
  formData.append(fieldName, new Blob([buffer]), filename);

  try {
    const method = isDocument || isPdf ? 'sendDocument' : 'sendPhoto';
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return !!data?.ok;
  } catch (e) {
    console.error('[Telegram] sendFile error:', e);
    return false;
  }
}

/** Получить username бота */
export async function getTelegramBotUsername(): Promise<string> {
  if (botUsername) return botUsername;
  const data = await api('getMe');
  if (data?.result?.username) {
    botUsername = data.result.username;
    return botUsername;
  }
  return process.env.TELEGRAM_BOT_USERNAME || '';
}

/** Отправить сообщение в чат */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const data = await api('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  });
  return !!data;
}

/** Обработка входящего сообщения (команда /start КОД) */
async function handleUpdate(update: any): Promise<void> {
  const msg = update?.message;
  if (!msg?.text) return;
  const text = String(msg.text).trim();
  const chatId = String(msg.chat?.id ?? '');
  if (!chatId) return;

  if (!text.startsWith('/start')) return;
  const code = text.split(/\s+/)[1]?.toUpperCase();
  if (!code) {
    await sendTelegramMessage(
      chatId,
      'Привязка к FireNotify.\n\nВ настройках нажмите «Запросить код привязки», затем отправьте: /start ВАШ_КОД'
    );
    return;
  }

  const user = await prisma.user.findFirst({ where: { telegramCode: code } });
  if (!user) {
    await sendTelegramMessage(chatId, 'Код не найден или устарел. Запросите новый код в настройках.');
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramId: chatId, telegramCode: null },
  });
  await sendTelegramMessage(
    chatId,
    `Аккаунт привязан к FireNotify. Здравствуйте, ${user.name || user.login}. Уведомления включите в настройках.`
  );
}

/** Long polling — получать обновления от Telegram */
async function poll(): Promise<void> {
  if (!token || polling) return;
  polling = true;
  let offset = 0;
  console.log('[Telegram] Bot started (long polling)');
  const me = await api('getMe');
  if (me?.result?.username) {
    botUsername = me.result.username;
    console.log('[Telegram] Bot: @' + botUsername);
  }
  while (polling && token) {
    try {
      const data = await fetch(
        `${API}/getUpdates?offset=${offset}&timeout=30`
      ).then((r) => r.json());
      if (!data?.ok || !Array.isArray(data.result)) break;
      for (const u of data.result) {
        offset = (u.update_id ?? offset) + 1;
        await handleUpdate(u);
      }
    } catch (e) {
      console.error('[Telegram] Poll error:', e);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  polling = false;
}

export function initTelegramBot(): void {
  if (!token) return;
  poll(); // запуск в фоне, не блокируем
}

export function isTelegramEnabled(): boolean {
  return isEnabled();
}
