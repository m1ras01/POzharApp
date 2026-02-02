import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { logAction } from '../lib/logAction.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '7d';

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      res.status(400).json({ error: 'Укажите логин и пароль' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { login: String(login).trim() } });
    if (!user) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }
    const token = jwt.sign(
      { userId: user.id, login: user.login, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES } as jwt.SignOptions
    );
  await logAction(user.id, 'LOGIN', 'user', user.id);
  res.json({
    token,
    user: {
      id: user.id,
      login: user.login,
      name: user.name,
      role: user.role,
    },
  });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Ошибка базы данных. Проверьте подключение к БД и настройки сервера.',
    });
  }
});

export { router as authRouter };
