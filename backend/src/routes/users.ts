import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { logAction } from '../lib/logAction.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireRole('ADMIN'), async (_req, res) => {
  const list = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      login: true,
      name: true,
      role: true,
      telegramEnabled: true,
      telegramId: true,
      createdAt: true,
    },
  });
  res.json(list);
});

router.get('/admins', async (_req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, login: true, name: true },
  });
  res.json(admins);
});

router.get('/:id', requireRole('ADMIN'), async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      login: true,
      name: true,
      role: true,
      telegramEnabled: true,
      telegramId: true,
      createdAt: true,
    },
  });
  if (!u) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }
  res.json(u);
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const curUser = (req as any).user;
  const { login, password, name, role } = req.body;
  if (!login || !password) {
    res.status(400).json({ error: 'Укажите логин и пароль' });
    return;
  }
  const loginTrim = String(login).trim();
  if (password.length < 6) {
    res.status(400).json({ error: 'Пароль не короче 6 символов' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { login: loginTrim } });
  if (existing) {
    res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    return;
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({
      data: {
        login: loginTrim,
        passwordHash: hash,
        name: name ? String(name).trim() || null : null,
        role: (role === 'ADMIN' || role === 'OBSERVER') ? role : 'OPERATOR',
      },
      select: {
        id: true,
        login: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    await logAction(curUser.id, 'CREATE_USER', 'user', u.id);
    res.status(201).json(u);
  } catch (e: any) {
    const code = e?.code;
    if (code === 'P2002') {
      res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
      return;
    }
    console.error('Create user error:', e);
    res.status(500).json({ error: e?.message || 'Ошибка создания пользователя' });
  }
});

router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const curUser = (req as any).user;
  const { name, role, password, telegramEnabled } = req.body;
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (telegramEnabled !== undefined) data.telegramEnabled = telegramEnabled;
  if (password && String(password).length >= 6) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }
  const u = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true,
      login: true,
      name: true,
      role: true,
      telegramEnabled: true,
      telegramId: true,
    },
  });
  await logAction(curUser.id, 'UPDATE_USER', 'user', u.id);
  res.json(u);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const curUser = (req as any).user;
  if (req.params.id === curUser.id) {
    res.status(400).json({ error: 'Нельзя удалить самого себя' });
    return;
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  await logAction(curUser.id, 'DELETE_USER', 'user', req.params.id);
  res.status(204).send();
});

export { router as usersRouter };
