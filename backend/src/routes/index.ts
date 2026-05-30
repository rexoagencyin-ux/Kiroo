import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import cartRoutes from './cart.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import addressRoutes from './address.routes';
import wishlistRoutes from './wishlist.routes';
import reviewRoutes from './review.routes';
import couponRoutes from './coupon.routes';
import bannerRoutes from './banner.routes';
import searchRoutes from './search.routes';
import uploadRoutes from './upload.routes';
import miscRoutes from './misc.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/addresses', addressRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/banners', bannerRoutes);
router.use('/search', searchRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin', adminRoutes);
router.use('/', miscRoutes);

export default router;
