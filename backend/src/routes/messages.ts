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
    include: {
      recipient: { select: { id: true, login: true, name: true } },
      adminRepliedBy: { select: { id: true, login: true, name: true } },
    },
  });
  // Для админа: входящие = лично ему ИЛИ «всем админам» (recipientId пустой)
  let received: any[];
  if (user.role === 'ADMIN') {
    const [toMe, toAllAdmins] = await Promise.all([
      prisma.message.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, login: true, name: true } },
          adminRepliedBy: { select: { id: true, login: true, name: true } },
        },
      }),
      prisma.message.findMany({
        where: { recipientId: null },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, login: true, name: true } },
          adminRepliedBy: { select: { id: true, login: true, name: true } },
        },
      }),
    ]);
    const seen = new Set<string>();
    received = [];
    for (const m of [...toMe, ...toAllAdmins]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      received.push(m);
    }
    received.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    received = await prisma.message.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, login: true, name: true } },
        adminRepliedBy: { select: { id: true, login: true, name: true } },
      },
    });
  }
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

/** Ответ администратора оператору — сохраняем и отправляем уведомление в Telegram */
router.patch('/:id/reply', requireRole('ADMIN'), async (req, res) => {
  const user = (req as any).user;
  const { reply } = req.body;
  const replyText = typeof reply === 'string' ? reply.trim() : '';
  if (!replyText) {
    res.status(400).json({ error: 'Укажите текст ответа оператору' });
    return;
  }
  const msg = await prisma.message.findUnique({
    where: { id: req.params.id },
    include: {
      sender: { select: { id: true, login: true, name: true, telegramId: true, telegramEnabled: true } },
    },
  });
  if (!msg) {
    res.status(404).json({ error: 'Заявка не найдена' });
    return;
  }
  const updated = await prisma.message.update({
    where: { id: req.params.id },
    data: {
      adminReply: replyText,
      adminRepliedAt: new Date(),
      adminRepliedById: user.id,
    },
    include: {
      sender: { select: { id: true, login: true, name: true } },
      adminRepliedBy: { select: { id: true, login: true, name: true } },
    },
  });
  await logAction(user.id, 'MESSAGE_REPLY', 'message', msg.id);
  const adminName = (user as any).name || (user as any).login || 'Администратор';
  if (msg.sender?.telegramEnabled && msg.sender?.telegramId) {
    const { notifyTelegramMessageReply } = await import('../lib/telegramNotify.js');
    notifyTelegramMessageReply(
      replyText,
      msg.sender.telegramId,
      adminName,
      msg.subject
    ).catch(() => {});
  }
  res.json(updated);
});

export { router as messagesRouter };
