import { Request, Response } from 'express';
import { query } from '../db/pool';

export const searchController = {
  /** Instant search: returns matching products + suggestion strings. */
  async instant(req: Request, res: Response) {
    const q = (req.query.q as string)?.trim() ?? '';
    if (q.length < 1) {
      return res.json({ success: true, products: [], suggestions: [], categories: [] });
    }

    // Persist search history (best-effort) for authed users
    if (req.user) {
      query('INSERT INTO search_history (user_id, term) VALUES ($1,$2)', [req.user.sub, q]).catch(
        () => undefined
      );
    }

    const like = `%${q}%`;
    const products = await query(
      `SELECT id, name, slug, price, flash_price, is_flash_sale, images, rating_avg
       FROM products
       WHERE is_active = TRUE AND (name ILIKE $1 OR brand ILIKE $1 OR description ILIKE $1)
       ORDER BY sold_count DESC LIMIT 8`,
      [like]
    );
    const suggestions = await query<{ name: string }>(
      `SELECT DISTINCT name FROM products WHERE is_active = TRUE AND name ILIKE $1 ORDER BY name LIMIT 6`,
      [like]
    );
    const categories = await query(
      `SELECT id, name, slug FROM categories WHERE is_active = TRUE AND name ILIKE $1 LIMIT 4`,
      [like]
    );

    res.json({
      success: true,
      products: products.rows,
      suggestions: suggestions.rows.map((s) => s.name),
      categories: categories.rows,
    });
  },

  async history(req: Request, res: Response) {
    const rows = await query<{ term: string }>(
      `SELECT DISTINCT ON (term) term, created_at FROM search_history
       WHERE user_id = $1 ORDER BY term, created_at DESC LIMIT 10`,
      [req.user!.sub]
    );
    res.json({ success: true, data: rows.rows.map((r) => r.term) });
  },

  async clearHistory(req: Request, res: Response) {
    await query('DELETE FROM search_history WHERE user_id = $1', [req.user!.sub]);
    res.json({ success: true, message: 'Search history cleared' });
  },

  /** Trending searches based on aggregate history. */
  async trending(_req: Request, res: Response) {
    const rows = await query<{ term: string }>(
      `SELECT term FROM search_history GROUP BY term ORDER BY COUNT(*) DESC LIMIT 8`
    );
    res.json({ success: true, data: rows.rows.map((r) => r.term) });
  },
};
