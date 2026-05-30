import { Request, Response } from 'express';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../utils/ApiError';

const PRODUCT_FIELDS = `
  p.id, p.name, p.slug, p.description, p.short_desc, p.brand, p.category_id,
  p.price, p.compare_price, p.sku, p.stock, p.low_stock_threshold, p.images, p.specifications,
  p.variants, p.tags, p.rating_avg, p.rating_count, p.is_featured, p.is_trending,
  p.is_new_arrival, p.is_flash_sale, p.flash_price, p.flash_ends_at, p.is_active,
  p.meta_title, p.meta_description, p.sold_count, p.created_at,
  c.name AS category_name, c.slug AS category_slug
`;

function effectivePrice(row: Record<string, unknown>) {
  const isFlash = row.is_flash_sale && row.flash_price != null;
  return {
    ...row,
    price: Number(row.price),
    compare_price: row.compare_price != null ? Number(row.compare_price) : null,
    flash_price: row.flash_price != null ? Number(row.flash_price) : null,
    effective_price: isFlash ? Number(row.flash_price) : Number(row.price),
    rating_avg: Number(row.rating_avg),
  };
}

export const productController = {
  /** Public product listing with filters, sorting, pagination. */
  async list(req: Request, res: Response) {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      filter, // featured | trending | new | flash
      sort = 'newest',
      page = '1',
      limit = '12',
      inStock,
    } = req.query as Record<string, string>;

    const where: string[] = ['p.is_active = TRUE'];
    const params: unknown[] = [];
    let i = 1;

    if (q) {
      where.push(`(p.name ILIKE $${i} OR p.brand ILIKE $${i} OR p.description ILIKE $${i})`);
      params.push(`%${q}%`);
      i++;
    }
    if (category) {
      where.push(`c.slug = $${i}`);
      params.push(category);
      i++;
    }
    if (brand) {
      where.push(`p.brand ILIKE $${i}`);
      params.push(brand);
      i++;
    }
    if (minPrice) {
      where.push(`p.price >= $${i}`);
      params.push(Number(minPrice));
      i++;
    }
    if (maxPrice) {
      where.push(`p.price <= $${i}`);
      params.push(Number(maxPrice));
      i++;
    }
    if (rating) {
      where.push(`p.rating_avg >= $${i}`);
      params.push(Number(rating));
      i++;
    }
    if (inStock === 'true') where.push('p.stock > 0');
    if (filter === 'featured') where.push('p.is_featured = TRUE');
    if (filter === 'trending') where.push('p.is_trending = TRUE');
    if (filter === 'new') where.push('p.is_new_arrival = TRUE');
    if (filter === 'flash') where.push('p.is_flash_sale = TRUE');

    const sortMap: Record<string, string> = {
      newest: 'p.created_at DESC',
      oldest: 'p.created_at ASC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      rating: 'p.rating_avg DESC',
      popular: 'p.sold_count DESC',
      discount: '(p.compare_price - p.price) DESC',
    };
    const orderBy = sortMap[sort] ?? sortMap.newest;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`,
      params
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    const rows = await query(
      `SELECT ${PRODUCT_FIELDS}
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ${whereSql}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data: rows.rows.map(effectivePrice),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  },

  async getBySlug(req: Request, res: Response) {
    const { slug } = req.params;
    const row = await queryOne(
      `SELECT ${PRODUCT_FIELDS}
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1 AND p.is_active = TRUE`,
      [slug]
    );
    if (!row) throw ApiError.notFound('Product not found');

    const related = await query(
      `SELECT ${PRODUCT_FIELDS}
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.category_id = $1 AND p.id <> $2 AND p.is_active = TRUE
       ORDER BY p.rating_avg DESC LIMIT 8`,
      [row.category_id, row.id]
    );
    const reviews = await query(
      `SELECT r.id, r.rating, r.title, r.comment, r.is_verified, r.created_at, u.name AS user_name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1 AND r.status = 'approved'
       ORDER BY r.created_at DESC LIMIT 50`,
      [row.id]
    );

    res.json({
      success: true,
      data: effectivePrice(row),
      related: related.rows.map(effectivePrice),
      reviews: reviews.rows,
    });
  },

  /** Homepage sections in one call. */
  async homeSections(_req: Request, res: Response) {
    const section = async (clause: string) =>
      (
        await query(
          `SELECT ${PRODUCT_FIELDS}
           FROM products p LEFT JOIN categories c ON c.id = p.category_id
           WHERE p.is_active = TRUE AND ${clause}
           ORDER BY p.created_at DESC LIMIT 10`
        )
      ).rows.map(effectivePrice);

    const [featured, trending, newArrivals, flashSale] = await Promise.all([
      section('p.is_featured = TRUE'),
      section('p.is_trending = TRUE'),
      section('p.is_new_arrival = TRUE'),
      section('p.is_flash_sale = TRUE AND (p.flash_ends_at IS NULL OR p.flash_ends_at > NOW())'),
    ]);

    res.json({ success: true, featured, trending, newArrivals, flashSale });
  },

  async brands(_req: Request, res: Response) {
    const rows = await query<{ brand: string }>(
      `SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND is_active = TRUE ORDER BY brand`
    );
    res.json({ success: true, data: rows.rows.map((r) => r.brand) });
  },
};
