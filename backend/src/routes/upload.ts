import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype?.includes('pdf') ? '.pdf' : '.jpg');
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : '.bin';
    const name = randomBytes(12).toString('hex') + safeExt;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype?.startsWith('image/') ||
      file.mimetype === 'application/pdf';
    if (ok) cb(null, true);
    else cb(new Error('Разрешены только изображения и PDF'));
  },
});

/** Загрузить файл (фото или PDF). Возвращает относительный путь для сохранения в БД. */
router.post(
  '/',
  requireRole('ADMIN', 'OPERATOR'),
  upload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'Файл не выбран или тип не поддерживается (нужны фото или PDF)' });
      return;
    }
    const relativePath = path.join('uploads', req.file.filename).replace(/\\/g, '/');
    res.json({ url: relativePath, filename: req.file.filename });
  },
  (err: any, _req: any, res: any, _next: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Файл слишком большой (макс. 15 МБ)' });
      return;
    }
    res.status(400).json({ error: err?.message ?? 'Ошибка загрузки' });
  }
);

/** Раздать загруженный файл (для просмотра в интерфейсе). */
router.get('/:filename', authMiddleware, (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (!filename || filename.includes('..') || path.isAbsolute(filename)) {
    res.status(400).json({ error: 'Недопустимое имя файла' });
    return;
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.status(404).json({ error: 'Файл не найден' });
    return;
  }
  res.sendFile(filename, { root: UPLOAD_DIR, dotfiles: 'deny' });
});

export { router as uploadRouter, UPLOAD_DIR };
