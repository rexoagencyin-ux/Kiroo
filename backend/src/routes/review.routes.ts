import { Router } from 'express';
import { z } from 'zod';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const createSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(160).optional(),
    comment: z.string().max(2000).optional(),
  }),
});

router.get('/product/:productId', asyncHandler(reviewController.listByProduct));
router.get('/mine', authenticate, asyncHandler(reviewController.mine));
router.post('/', authenticate, validate(createSchema), asyncHandler(reviewController.create));

export default router;
