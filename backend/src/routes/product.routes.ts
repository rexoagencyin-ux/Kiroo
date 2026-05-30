import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(productController.list));
router.get('/home', asyncHandler(productController.homeSections));
router.get('/brands', asyncHandler(productController.brands));
router.get('/:slug', asyncHandler(productController.getBySlug));

export default router;
