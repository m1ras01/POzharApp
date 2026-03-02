/**
 * Создание заявок из входящей почты (IMAP).
 * Соответствие ТД: «возможность создания заявок через e-mail», SMTP/IMAP интеграция.
 *
 * Запуск: из папки backend: npm run email:ingest
 * Или по расписанию (cron): */5 * * * * cd /opt/firenotify/backend && npm run email:ingest
 *
 * Переменные в .env:
 *   IMAP_HOST=imap.example.com
 *   IMAP_PORT=993
 *   IMAP_SECURE=true
 *   IMAP_USER=inbox@example.com
 *   IMAP_PASSWORD=...
 *   IMAP_MAILBOX=INBOX
 */
import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '../lib/prisma.js';

const IMAP_HOST = process.env.IMAP_HOST?.trim();
const IMAP_PORT = parseInt(process.env.IMAP_PORT ?? '993', 10);
const IMAP_SECURE = process.env.IMAP_SECURE !== 'false';
const IMAP_USER = process.env.IMAP_USER?.trim();
const IMAP_PASSWORD = process.env.IMAP_PASSWORD?.trim();
const IMAP_MAILBOX = process.env.IMAP_MAILBOX?.trim() || 'INBOX';

function isConfigured(): boolean {
  return !!(IMAP_HOST && IMAP_USER && IMAP_PASSWORD);
}

async function run(): Promise<void> {
  if (!isConfigured()) {
    console.log('[Email Ingest] IMAP не настроен (IMAP_HOST, IMAP_USER, IMAP_PASSWORD). Выход.');
    process.exit(0);
  }

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: IMAP_SECURE,
    auth: { user: IMAP_USER, pass: IMAP_PASSWORD },
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(IMAP_MAILBOX);
    let created = 0;
    try {
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true })) {
        try {
          const parsed = await simpleParser(msg.source);
          const subject = parsed.subject?.trim() || 'Без темы';
          const text = (parsed.text || parsed.html || '').trim().slice(0, 2000);
          const from = parsed.from?.text?.trim() || '';

          await prisma.notification.create({
            data: {
              source: 'Email',
              address: subject,
              description: [from, text].filter(Boolean).join('\n\n'),
              status: 'NEW',
            },
          });
          created++;
          await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
        } catch (e) {
          console.error('[Email Ingest] Ошибка обработки письма:', e);
        }
      }
    } finally {
      lock.release();
    }
    console.log('[Email Ingest] Обработано писем, создано заявок:', created);
  } catch (e) {
    console.error('[Email Ingest] Ошибка:', e);
    process.exit(1);
  } finally {
    client.logout().catch(() => {});
  }
}

run();
