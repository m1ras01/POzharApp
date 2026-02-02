import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { logAction } from '../lib/logAction.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { status, from, to, search, limit, department } = req.query;
  const where: any = {};
  if (status) where.status = status as string;
  if (department && String(department).trim()) where.department = String(department).trim();
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
    ];
  }
  const take = limit ? Math.min(Number(limit) || 100, 500) : undefined;
  const list = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: { assignedTo: { select: { id: true, name: true, login: true } } },
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

router.get('/:id', async (req, res) => {
  const n = await prisma.notification.findUnique({
    where: { id: req.params.id },
    include: { assignedTo: { select: { id: true, name: true, login: true } } },
  });
  if (!n) {
    res.status(404).json({ error: 'Уведомление не найдено' });
    return;
  }
  res.json(n);
});

router.post('/', requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const user = (req as any).user;
  const { source, address, description, department } = req.body;
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
      status: 'NEW',
    },
  });
  await logAction(user.id, 'CREATE_NOTIFICATION', 'notification', n.id);
  const { notifyTelegramNewNotification } = await import('../lib/telegramNotify.js');
  notifyTelegramNewNotification(n).catch(() => {});
  res.status(201).json(n);
});

router.patch('/:id', async (req, res) => {
  const user = (req as any).user;
  const { status, comments, assignedToId, department } = req.body;
  const data: any = {};
  if (status !== undefined) data.status = status;
  if (comments !== undefined) data.comments = comments;
  if (assignedToId !== undefined && user.role === 'ADMIN') data.assignedToId = assignedToId || null;
  if (department !== undefined) data.department = department ? String(department).trim() : null;
  if (status === 'CLOSED') data.closedAt = new Date();
  const n = await prisma.notification.update({
    where: { id: req.params.id },
    data,
    include: { assignedTo: { select: { id: true, name: true, login: true } } },
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
