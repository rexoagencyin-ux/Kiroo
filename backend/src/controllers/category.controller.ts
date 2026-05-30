import { Request, Response } from 'express';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../utils/ApiError';

export const categoryController = {
  async list(_req: Request, res: Response) {
    const rows = await query(
      `SELECT c.*, COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
       WHERE c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    );
    res.json({ success: true, data: rows.rows });
  },

  async getBySlug(req: Request, res: Response) {
    const category = await queryOne(
      'SELECT * FROM categories WHERE slug = $1 AND is_active = TRUE',
      [req.params.slug]
    );
    if (!category) throw ApiError.notFound('Category not found');
    res.json({ success: true, data: category });
  },
};
