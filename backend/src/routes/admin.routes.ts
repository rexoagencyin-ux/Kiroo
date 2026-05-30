import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate, requireAdmin);

// Dashboard & analytics
router.get('/dashboard', asyncHandler(adminController.dashboard));
router.get('/analytics', asyncHandler(adminController.analytics));
router.get('/inventory', asyncHandler(adminController.inventory));

// Products
router.get('/products', asyncHandler(adminController.listProducts));
router.post('/products', asyncHandler(adminController.createProduct));
router.post('/products/bulk', asyncHandler(adminController.bulkUploadProducts));
router.patch('/products/:id', asyncHandler(adminController.updateProduct));
router.patch('/products/:id/stock', asyncHandler(adminController.updateStock));
router.delete('/products/:id', asyncHandler(adminController.deleteProduct));

// Categories
router.post('/categories', asyncHandler(adminController.createCategory));
router.patch('/categories/:id', asyncHandler(adminController.updateCategory));
router.delete('/categories/:id', asyncHandler(adminController.deleteCategory));

// Orders
router.get('/orders', asyncHandler(adminController.listOrders));
router.get('/orders/:id', asyncHandler(adminController.getOrder));
router.get('/orders/:id/invoice', asyncHandler(adminController.invoice));
router.patch('/orders/:id/status', asyncHandler(adminController.updateOrderStatus));
router.post('/orders/:id/ship', asyncHandler(adminController.shipOrder));

// Customers
router.get('/customers', asyncHandler(adminController.listCustomers));
router.get('/customers/:id', asyncHandler(adminController.getCustomer));
router.post('/customers/:id/toggle', asyncHandler(adminController.toggleCustomer));

// Coupons
router.get('/coupons', asyncHandler(adminController.listCoupons));
router.post('/coupons', asyncHandler(adminController.createCoupon));
router.patch('/coupons/:id', asyncHandler(adminController.updateCoupon));
router.delete('/coupons/:id', asyncHandler(adminController.deleteCoupon));

// Banners
router.get('/banners', asyncHandler(adminController.listBanners));
router.post('/banners', asyncHandler(adminController.createBanner));
router.patch('/banners/:id', asyncHandler(adminController.updateBanner));
router.delete('/banners/:id', asyncHandler(adminController.deleteBanner));

// Reviews
router.get('/reviews', asyncHandler(adminController.listReviews));
router.post('/reviews/:id/moderate', asyncHandler(adminController.moderateReview));

export default router;
