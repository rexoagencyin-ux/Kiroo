import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Only image files are allowed'));
    }
  },
});
