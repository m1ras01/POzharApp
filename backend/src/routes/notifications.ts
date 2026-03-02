import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { logAction } from '../lib/logAction.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { status, from, to, search, limit, department, authorId, problemType, address } = req.query;
  const where: any = {};
  if (status) where.status = status as string;
  if (department && String(department).trim()) where.department = String(department).trim();
  if (authorId && String(authorId).trim()) where.createdById = String(authorId).trim();
  if (problemType && String(problemType).trim()) where.problemType = String(problemType).trim();
  if (address && String(address).trim()) where.address = { contains: String(address).trim() };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to));
  }
  if (search && String(search).trim()) {
    const q = String(search).trim();
    where.OR = [
      { source: { contains: q } },
      { address: { contains: q } },
      { description: { contains: q } },
      { comments: { contains: q } },
    ];
  }
  const take = limit ? Math.min(Number(limit) || 100, 500) : undefined;
  const list = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      assignedTo: { select: { id: true, name: true, login: true } },
      createdBy: { select: { id: true, name: true, login: true } },
    },
  });
  res.json(list);
});

router.get('/stats', async (_req, res) => {
  const [active, processed] = await Promise.all([
    prisma.notification.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] } } }),
    prisma.notification.count({ where: { status: { in: ['VERIFIED', 'FALSE_ALARM', 'CLOSED'] } } }),
  ]);
  res.json({ active, processed });
});

// Список авторов обращений (для фильтра расширенного поиска)
router.get('/authors', async (_req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { createdById: { not: null } },
    select: { createdById: true },
    distinct: ['createdById'],
  });
  const ids = notifications.map((n) => n.createdById).filter(Boolean) as string[];
  if (ids.length === 0) {
    res.json([]);
    return;
  }
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, login: true, name: true },
  });
  res.json(users);
});

// Комментарии к заявке (диалог по заявке, история переписки)
router.get('/:id/comments', async (req, res) => {
  const list = await prisma.notificationComment.findMany({
    where: { notificationId: req.params.id },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, login: true } } },
  });
  res.json(list);
});

router.post('/:id/comments', requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const user = (req as any).user;
  const { text } = req.body;
  if (!text || !String(text).trim()) {
    res.status(400).json({ error: 'Укажите текст комментария' });
    return;
  }
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) {
    res.status(404).json({ error: 'Уведомление не найдено' });
    return;
  }
  const comment = await prisma.notificationComment.create({
    data: {
      notificationId: req.params.id,
      userId: user.id,
      text: String(text).trim(),
    },
    include: { user: { select: { id: true, name: true, login: true } } },
  });
  await logAction(user.id, 'ADD_COMMENT', 'notification', req.params.id);
  res.status(201).json(comment);
});

// Журнал изменений по заявке
router.get('/:id/changelog', async (req, res) => {
  const list = await prisma.actionLog.findMany({
    where: { entity: 'notification', entityId: req.params.id },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, login: true } } },
  });
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const n = await prisma.notification.findUnique({
    where: { id: req.params.id },
    include: {
      assignedTo: { select: { id: true, name: true, login: true } },
      createdBy: { select: { id: true, name: true, login: true } },
    },
  });
  if (!n) {
    res.status(404).json({ error: 'Уведомление не найдено' });
    return;
  }
  res.json(n);
});

router.post('/', requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const user = (req as any).user;
  const { source, address, description, department, problemType } = req.body;
  if (!source || !address) {
    res.status(400).json({ error: 'Укажите источник и адрес' });
    return;
  }
  const n = await prisma.notification.create({
    data: {
      source: String(source).trim(),
      address: String(address).trim(),
      description: description ? String(description) : null,
      department: department ? String(department).trim() : null,
      problemType: problemType ? String(problemType).trim() : null,
      status: 'NEW',
      createdById: user.id,
    },
  });
  await logAction(user.id, 'CREATE_NOTIFICATION', 'notification', n.id);
  const { notifyTelegramNewNotification } = await import('../lib/telegramNotify.js');
  notifyTelegramNewNotification(n).catch(() => {});
  res.status(201).json(n);
});

router.patch('/:id', requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const user = (req as any).user;
  const { status, comments, assignedToId, department, source, address, description, problemType } = req.body;
  const data: any = {};
  if (status !== undefined) data.status = status;
  if (comments !== undefined) data.comments = comments;
  if (assignedToId !== undefined && user.role === 'ADMIN') data.assignedToId = assignedToId || null;
  if (department !== undefined) data.department = department ? String(department).trim() : null;
  if (source !== undefined) data.source = String(source).trim();
  if (address !== undefined) data.address = String(address).trim();
  if (description !== undefined) data.description = description ? String(description) : null;
  if (problemType !== undefined) data.problemType = problemType ? String(problemType).trim() : null;
  if (status === 'CLOSED') data.closedAt = new Date();
  const n = await prisma.notification.update({
    where: { id: req.params.id },
    data,
    include: {
      assignedTo: { select: { id: true, name: true, login: true } },
      createdBy: { select: { id: true, name: true, login: true } },
    },
  });
  await logAction(user.id, 'UPDATE_NOTIFICATION', 'notification', n.id, JSON.stringify(data));
  res.json(n);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const user = (req as any).user;
  await prisma.notification.delete({ where: { id: req.params.id } });
  await logAction(user.id, 'DELETE_NOTIFICATION', 'notification', req.params.id);
  res.status(204).send();
});

export { router as notificationsRouter };
