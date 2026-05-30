import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Webhook is unauthenticated (verified via signature). Raw body captured in app.ts.
router.post('/webhook', asyncHandler(paymentController.webhook));

router.use(authenticate);
router.post('/create-order', asyncHandler(paymentController.createRazorpayOrder));
router.post('/verify', asyncHandler(paymentController.verify));

export default router;
