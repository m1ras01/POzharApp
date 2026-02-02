import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let s = '';
  const buf = randomBytes(length);
  for (let i = 0; i < length; i++) s += chars[buf[i]! % chars.length];
  return s;
}

async function main() {
  const adminLogin = (process.env.ADMIN_LOGIN ?? 'admin').trim() || 'admin';
  let adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword || adminPassword.length < 10) {
    // Пароль должен быть не короче 10 символов для продакшена
    adminPassword = generatePassword(16);
    console.log('---');
    console.log('ADMIN_PASSWORD не задан в .env — сгенерирован одноразовый пароль. Сохраните его:');
    console.log(adminPassword);
    console.log('---');
  }
  const hash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { login: adminLogin },
    update: { passwordHash: hash },
    create: {
      login: adminLogin,
      passwordHash: hash,
      name: 'Администратор',
      role: 'ADMIN',
    },
  });
  console.log('Seed: администратор создан/обновлён, логин:', admin.login);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
