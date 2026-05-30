import { Router } from 'express';
import { z } from 'zod';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const addressShape = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(7),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  postal_code: z.string().min(4),
  country: z.string().optional(),
});

const createSchema = z.object({
  body: z
    .object({
      paymentMethod: z.enum(['razorpay', 'cod']),
      addressId: z.string().uuid().optional(),
      address: addressShape.optional(),
      couponCode: z.string().optional(),
      notes: z.string().max(500).optional(),
    })
    .refine((d) => d.addressId || d.address, {
      message: 'addressId or address is required',
    }),
});

// Public tracking by order number
router.get('/track/:orderNumber', asyncHandler(orderController.track));

router.use(authenticate);
router.post('/', validate(createSchema), asyncHandler(orderController.create));
router.get('/', asyncHandler(orderController.listMine));
router.get('/:id', asyncHandler(orderController.getOne));
router.post('/:id/cancel', asyncHandler(orderController.cancel));

export default router;
