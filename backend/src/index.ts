import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { notificationsRouter } from './routes/notifications.js';
import { messagesRouter } from './routes/messages.js';
import { usersRouter } from './routes/users.js';
import { reportsRouter } from './routes/reports.js';
import { settingsRouter } from './routes/settings.js';
import { logsRouter } from './routes/logs.js';
import { uploadRouter } from './routes/upload.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'FireNotify API' });
});

app.use('/api/auth', authRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/messages', authMiddleware, messagesRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/reports', authMiddleware, reportsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/logs', authMiddleware, logsRouter);
app.use('/api/upload', authMiddleware, uploadRouter);

const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`FireNotify API running at http://localhost:${PORT}`);
  try {
    const { initTelegramBot } = await import('./telegram/bot.js');
    initTelegramBot();
  } catch (e) {
    console.log('[Telegram] Ne podklyuchen:', (e as Error).message);
  }
});
