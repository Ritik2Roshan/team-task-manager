import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import multer from 'multer';

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads', 'projects');

const maxMb = Number(process.env.UPLOAD_MAX_MB || 25);

export const projectUpload = multer({
  preservePath: true,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const projectId = String(req.params.id || '');
      const dir = path.join(UPLOAD_ROOT, projectId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '') || '';
      cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: {
    fileSize: maxMb * 1024 * 1024,
    files: 500,
  },
});

export function getProjectUploadDir(projectId) {
  return path.join(UPLOAD_ROOT, String(projectId));
}
