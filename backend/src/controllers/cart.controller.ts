import { Request, Response } from 'express';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../utils/ApiError';
import { computeBreakdown } from '../utils/pricing';
import { CouponLike } from '../utils/pricing';

interface CartRow {
  id: string;
  product_id: string;
  variant: string | null;
  quantity: number;
  name: string;
  slug: string;
  images: string[];
  price: string;
  flash_price: string | null;
  is_flash_sale: boolean;
  stock: number;
}

async function loadCart(userId: string) {
  const rows = await query<CartRow>(
    `SELECT ci.id, ci.product_id, ci.variant, ci.quantity,
            p.name, p.slug, p.images, p.price, p.flash_price, p.is_flash_sale, p.stock
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1 AND p.is_active = TRUE
     ORDER BY ci.created_at DESC`,
    [userId]
  );

  const items = rows.rows.map((r) => {
    const unitPrice = r.is_flash_sale && r.flash_price != null ? Number(r.flash_price) : Number(r.price);
    return {
      id: r.id,
      product_id: r.product_id,
      name: r.name,
      slug: r.slug,
      image: Array.isArray(r.images) ? r.images[0] : null,
      variant: r.variant,
      price: unitPrice,
      quantity: r.quantity,
      stock: r.stock,
      lineTotal: Math.round(unitPrice * r.quantity * 100) / 100,
    };
  });

  return items;
}

async function resolveCoupon(code: string | undefined, subtotal: number): Promise<CouponLike | null> {
  if (!code) return null;
  const c = await queryOne<{
    type: 'percentage' | 'fixed';
    value: string;
    min_order: string;
    max_discount: string | null;
    is_active: boolean;
    expires_at: string | null;
    starts_at: string | null;
  }>('SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE', [code.toUpperCase()]);
  if (!c) return null;
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return null;
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return null;
  if (subtotal < Number(c.min_order)) return null;
  return {
    type: c.type,
    value: Number(c.value),
    min_order: Number(c.min_order),
    max_discount: c.max_discount != null ? Number(c.max_discount) : null,
  };
}

export const cartController = {
  async get(req: Request, res: Response) {
    const items = await loadCart(req.user!.sub);
    const couponCode = (req.query.coupon as string) ?? undefined;
    const lines = items.map((it) => ({ price: it.price, quantity: it.quantity }));
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const coupon = await resolveCoupon(couponCode, subtotal);
    const breakdown = computeBreakdown(lines, coupon);
    res.json({
      success: true,
      items,
      coupon: coupon ? couponCode?.toUpperCase() : null,
      summary: breakdown,
    });
  },

  async add(req: Request, res: Response) {
    const { productId, quantity = 1, variant } = req.body as {
      productId: string;
      quantity?: number;
      variant?: string;
    };
    const product = await queryOne<{ stock: number }>(
      'SELECT stock FROM products WHERE id = $1 AND is_active = TRUE',
      [productId]
    );
    if (!product) throw ApiError.notFound('Product not found');
    if (product.stock < quantity) throw ApiError.badRequest('Not enough stock available');

    await query(
      `INSERT INTO cart_items (user_id, product_id, variant, quantity)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, product_id, variant)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [req.user!.sub, productId, variant ?? null, quantity]
    );
    const items = await loadCart(req.user!.sub);
    res.status(201).json({ success: true, items });
  },

  async update(req: Request, res: Response) {
    const { quantity } = req.body as { quantity: number };
    if (quantity < 1) throw ApiError.badRequest('Quantity must be at least 1');
    const item = await queryOne<{ product_id: string }>(
      'SELECT product_id FROM cart_items WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.sub]
    );
    if (!item) throw ApiError.notFound('Cart item not found');
    const product = await queryOne<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [
      item.product_id,
    ]);
    if (product && product.stock < quantity) throw ApiError.badRequest('Not enough stock available');
    await query('UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3', [
      quantity,
      req.params.id,
      req.user!.sub,
    ]);
    const items = await loadCart(req.user!.sub);
    res.json({ success: true, items });
  },

  async remove(req: Request, res: Response) {
    await query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user!.sub,
    ]);
    const items = await loadCart(req.user!.sub);
    res.json({ success: true, items });
  },

  async clear(req: Request, res: Response) {
    await query('DELETE FROM cart_items WHERE user_id = $1', [req.user!.sub]);
    res.json({ success: true, items: [] });
  },

  /** Merge a guest cart (from localStorage) into the server cart on login. */
  async merge(req: Request, res: Response) {
    const { items } = req.body as { items: { productId: string; quantity: number; variant?: string }[] };
    for (const it of items ?? []) {
      const product = await queryOne<{ stock: number }>(
        'SELECT stock FROM products WHERE id = $1 AND is_active = TRUE',
        [it.productId]
      );
      if (!product) continue;
      await query(
        `INSERT INTO cart_items (user_id, product_id, variant, quantity)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, product_id, variant)
         DO UPDATE SET quantity = GREATEST(cart_items.quantity, EXCLUDED.quantity)`,
        [req.user!.sub, it.productId, it.variant ?? null, Math.max(1, it.quantity)]
      );
    }
    const merged = await loadCart(req.user!.sub);
    res.json({ success: true, items: merged });
  },
};

export { loadCart, resolveCoupon };
