import { Router } from 'express';
import { z } from 'zod';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

const addSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(99).optional(),
    variant: z.string().optional(),
  }),
});
const updateSchema = z.object({
  body: z.object({ quantity: z.number().int().positive().max(99) }),
});

router.get('/', asyncHandler(cartController.get));
router.post('/', validate(addSchema), asyncHandler(cartController.add));
router.post('/merge', asyncHandler(cartController.merge));
router.patch('/:id', validate(updateSchema), asyncHandler(cartController.update));
router.delete('/:id', asyncHandler(cartController.remove));
router.delete('/', asyncHandler(cartController.clear));

export default router;
