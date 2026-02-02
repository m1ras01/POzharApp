import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { logAction } from '../lib/logAction.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const user = (req as any).user;
  const sent = await prisma.message.findMany({
    where: { senderId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { recipient: { select: { id: true, login: true, name: true } } },
  });
  const received = await prisma.message.findMany({
    where: user.role === 'ADMIN'
      ? { OR: [{ recipientId: user.id }, { recipientId: null }] }
      : { recipientId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { id: true, login: true, name: true } } },
  });
  res.json({ sent, received });
});

router.post('/', requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const user = (req as any).user;
  const { workObject, subject, body, attachmentUrl } = req.body;
  if (!body) {
    res.status(400).json({ error: 'Укажите текст заявки' });
    return;
  }
  if (!workObject || typeof workObject !== 'string' || !workObject.trim()) {
    res.status(400).json({ error: 'Выберите объект для выполнения работ' });
    return;
  }
  const msg = await prisma.message.create({
    data: {
      senderId: user.id,
      recipientId: null,
      workObject: workObject.trim(),
      subject: subject ? String(subject) : null,
      body: String(body),
      attachmentUrl: attachmentUrl ? String(attachmentUrl) : null,
    },
    include: {
      recipient: { select: { id: true, login: true, name: true } },
    },
  });
  await logAction(user.id, 'SEND_MESSAGE', 'message', msg.id);
  const { notifyTelegramNewMessage } = await import('../lib/telegramNotify.js');
  const senderName = (user as any).name || (user as any).login || 'Сотрудник';
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', telegramEnabled: true, telegramId: { not: null } },
    select: { telegramId: true },
  });
  for (const a of admins) {
    if (a.telegramId) {
      notifyTelegramNewMessage(
        {
          workObject: msg.workObject,
          subject: msg.subject,
          body: msg.body,
          attachmentUrl: msg.attachmentUrl,
        },
        senderName,
        a.telegramId
      ).catch(() => {});
    }
  }
  res.status(201).json(msg);
});

router.patch('/:id/read', async (req, res) => {
  const user = (req as any).user;
  const msg = await prisma.message.findUnique({
    where: { id: req.params.id },
    select: { recipientId: true },
  });
  if (!msg) {
    res.status(404).json({ error: 'Заявка не найдена' });
    return;
  }
  const canRead = msg.recipientId === user.id || (msg.recipientId === null && user.role === 'ADMIN');
  if (!canRead) {
    res.status(404).json({ error: 'Заявка не найдена' });
    return;
  }
  const updated = await prisma.message.update({
    where: { id: req.params.id },
    data: { readAt: new Date() },
  });
  res.json(updated);
});

export { router as messagesRouter };
