import { Router } from 'express';
import { z } from 'zod';
import { wishlistController } from '../controllers/wishlist.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

const idSchema = z.object({ body: z.object({ productId: z.string().uuid() }) });

router.get('/', asyncHandler(wishlistController.list));
router.post('/', validate(idSchema), asyncHandler(wishlistController.add));
router.post('/move-to-cart', validate(idSchema), asyncHandler(wishlistController.moveToCart));
router.delete('/:productId', asyncHandler(wishlistController.remove));

export default router;
