import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate, requireAdmin);

router.post('/', upload.single('image'), asyncHandler(uploadController.single));
router.post('/multiple', upload.array('images', 8), asyncHandler(uploadController.multiple));
router.delete('/', asyncHandler(uploadController.destroy));

export default router;
