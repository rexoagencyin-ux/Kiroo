import { Router } from 'express';
import { miscController } from '../controllers/misc.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/newsletter', asyncHandler(miscController.subscribeNewsletter));
router.get('/notifications', authenticate, asyncHandler(miscController.listNotifications));
router.post('/notifications/:id/read', authenticate, asyncHandler(miscController.markNotificationRead));
router.post('/notifications/read-all', authenticate, asyncHandler(miscController.markAllNotificationsRead));

export default router;
