/**
 * Создание заявок из входящей почты (IMAP).
 * Соответствие ТД: «возможность создания заявок через e-mail», SMTP/IMAP интеграция.
 *
 * Запуск: из папки backend: npm run email:ingest
 * Или по расписанию (cron), например каждые 5 минут:
 *   (cron)  every 5 minutes  ->  cd /opt/firenotify/backend && npm run email:ingest
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
import { simpleParser, type Source as MailSource } from 'mailparser';
import { prisma } from '../lib/prisma.js';

async function run(): Promise<void> {
  const host = process.env.IMAP_HOST?.trim();
  const user = process.env.IMAP_USER?.trim();
  const pass = process.env.IMAP_PASSWORD?.trim();
  if (!host || !user || !pass) {
    console.log('[Email Ingest] IMAP не настроен (IMAP_HOST, IMAP_USER, IMAP_PASSWORD). Выход.');
    process.exit(0);
  }
  const port = parseInt(process.env.IMAP_PORT ?? '993', 10);
  const secure = process.env.IMAP_SECURE !== 'false';
  const mailbox = process.env.IMAP_MAILBOX?.trim() || 'INBOX';

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);
    let created = 0;
    try {
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true })) {
        try {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source as MailSource);
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
