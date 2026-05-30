import { Router } from 'express';
import { z } from 'zod';
import { couponController } from '../controllers/coupon.controller';
import { optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const validateSchema = z.object({
  body: z.object({ code: z.string().min(2), subtotal: z.number().nonnegative() }),
});

router.post('/validate', optionalAuth, validate(validateSchema), asyncHandler(couponController.validate));

export default router;
