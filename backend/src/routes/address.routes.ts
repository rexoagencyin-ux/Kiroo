import { Router } from 'express';
import { z } from 'zod';
import { addressController } from '../controllers/address.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  body: z.object({
    full_name: z.string().min(2),
    phone: z.string().min(7),
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    postal_code: z.string().min(4),
    country: z.string().optional(),
    is_default: z.boolean().optional(),
  }),
});

router.get('/', asyncHandler(addressController.list));
router.post('/', validate(createSchema), asyncHandler(addressController.create));
router.patch('/:id', asyncHandler(addressController.update));
router.delete('/:id', asyncHandler(addressController.remove));
router.post('/:id/default', asyncHandler(addressController.setDefault));

export default router;
