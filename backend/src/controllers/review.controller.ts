import { Request, Response } from 'express';
import { query, queryOne, withTransaction } from '../db/pool';
import { ApiError } from '../utils/ApiError';

async function recalcRating(productId: string) {
  await query(
    `UPDATE products SET
       rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE product_id = $1 AND status = 'approved'), 0),
       rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND status = 'approved')
     WHERE id = $1`,
    [productId]
  );
}

export const reviewController = {
  async listByProduct(req: Request, res: Response) {
    const rows = await query(
      `SELECT r.id, r.rating, r.title, r.comment, r.is_verified, r.created_at, u.name AS user_name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1 AND r.status = 'approved'
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    );
    const summary = await queryOne<{ avg: string; count: string }>(
      "SELECT COALESCE(AVG(rating),0) AS avg, COUNT(*) AS count FROM reviews WHERE product_id = $1 AND status = 'approved'",
      [req.params.productId]
    );
    res.json({
      success: true,
      data: rows.rows,
      summary: { average: Number(summary?.avg ?? 0), count: Number(summary?.count ?? 0) },
    });
  },

  async create(req: Request, res: Response) {
    const { productId, rating, title, comment } = req.body as {
      productId: string;
      rating: number;
      title?: string;
      comment?: string;
    };
    const product = await queryOne('SELECT id FROM products WHERE id = $1', [productId]);
    if (!product) throw ApiError.notFound('Product not found');

    // Verified purchase if a delivered/confirmed order with this product exists
    const purchase = await queryOne(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = $1 AND o.user_id = $2 AND o.payment_status IN ('paid')
       OR (oi.product_id = $1 AND o.user_id = $2 AND o.status IN ('delivered','confirmed','shipped'))
       LIMIT 1`,
      [productId, req.user!.sub]
    );
    const isVerified = !!purchase;

    try {
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified, status)
           VALUES ($1,$2,$3,$4,$5,$6,'approved')`,
          [productId, req.user!.sub, rating, title ?? null, comment ?? null, isVerified]
        );
      });
    } catch (e) {
      if ((e as { code?: string }).code === '23505') {
        throw ApiError.conflict('You have already reviewed this product');
      }
      throw e;
    }
    await recalcRating(productId);
    res.status(201).json({ success: true, message: 'Review submitted', verified: isVerified });
  },

  async mine(req: Request, res: Response) {
    const rows = await query(
      `SELECT r.*, p.name AS product_name, p.slug AS product_slug
       FROM reviews r JOIN products p ON p.id = r.product_id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
      [req.user!.sub]
    );
    res.json({ success: true, data: rows.rows });
  },
};

export { recalcRating };
