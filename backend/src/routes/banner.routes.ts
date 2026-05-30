import { Router } from 'express';
import { bannerController } from '../controllers/banner.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.get('/', asyncHandler(bannerController.list));

export default router;
