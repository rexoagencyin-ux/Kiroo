import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', optionalAuth, asyncHandler(searchController.instant));
router.get('/trending', asyncHandler(searchController.trending));
router.get('/history', authenticate, asyncHandler(searchController.history));
router.delete('/history', authenticate, asyncHandler(searchController.clearHistory));

export default router;
