import { Request, Response } from 'express';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../utils/ApiError';

export const wishlistController = {
  async list(req: Request, res: Response) {
    const rows = await query(
      `SELECT w.id AS wishlist_id, p.id, p.name, p.slug, p.price, p.compare_price,
              p.flash_price, p.is_flash_sale, p.images, p.rating_avg, p.stock
       FROM wishlists w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1 AND p.is_active = TRUE
       ORDER BY w.created_at DESC`,
      [req.user!.sub]
    );
    res.json({ success: true, data: rows.rows });
  },

  async add(req: Request, res: Response) {
    const { productId } = req.body as { productId: string };
    const product = await queryOne('SELECT id FROM products WHERE id = $1', [productId]);
    if (!product) throw ApiError.notFound('Product not found');
    await query(
      'INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2) ON CONFLICT (user_id, product_id) DO NOTHING',
      [req.user!.sub, productId]
    );
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  },

  async remove(req: Request, res: Response) {
    await query('DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2', [
      req.user!.sub,
      req.params.productId,
    ]);
    res.json({ success: true, message: 'Removed from wishlist' });
  },

  async moveToCart(req: Request, res: Response) {
    const { productId } = req.body as { productId: string };
    const product = await queryOne<{ stock: number }>(
      'SELECT stock FROM products WHERE id = $1 AND is_active = TRUE',
      [productId]
    );
    if (!product) throw ApiError.notFound('Product not found');
    if (product.stock < 1) throw ApiError.badRequest('Product is out of stock');
    await query(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,1)
       ON CONFLICT (user_id, product_id, variant) DO UPDATE SET quantity = cart_items.quantity + 1`,
      [req.user!.sub, productId]
    );
    await query('DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2', [req.user!.sub, productId]);
    res.json({ success: true, message: 'Moved to cart' });
  },
};
