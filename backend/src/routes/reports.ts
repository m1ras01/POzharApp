import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(String(to)) : new Date();
  const notifications = await prisma.notification.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
    },
    orderBy: { createdAt: 'desc' },
    include: { assignedTo: { select: { name: true, login: true } } },
  });
  const byStatus = await prisma.notification.groupBy({
    by: ['status'],
    where: { createdAt: { gte: fromDate, lte: toDate } },
    _count: true,
  });
  res.json({
    period: { from: fromDate, to: toDate },
    total: notifications.length,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    notifications,
  });
});

export { router as reportsRouter };
