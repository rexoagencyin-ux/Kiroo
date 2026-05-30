import { Request, Response } from 'express';
import { queryOne } from '../db/pool';
import { ApiError } from '../utils/ApiError';
import { computeDiscount } from '../utils/pricing';

export const couponController = {
  /** Validate a coupon against a subtotal and return the discount. */
  async validate(req: Request, res: Response) {
    const { code, subtotal } = req.body as { code: string; subtotal: number };
    const coupon = await queryOne<{
      id: string;
      type: 'percentage' | 'fixed';
      value: string;
      min_order: string;
      max_discount: string | null;
      usage_limit: number | null;
      used_count: number;
      per_user_limit: number;
      starts_at: string | null;
      expires_at: string | null;
      is_active: boolean;
    }>('SELECT * FROM coupons WHERE code = $1', [code.toUpperCase()]);

    if (!coupon || !coupon.is_active) throw ApiError.badRequest('Invalid coupon code');
    const now = Date.now();
    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now)
      throw ApiError.badRequest('Coupon is not active yet');
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now)
      throw ApiError.badRequest('Coupon has expired');
    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit)
      throw ApiError.badRequest('Coupon usage limit reached');
    if (subtotal < Number(coupon.min_order))
      throw ApiError.badRequest(`Minimum order of ₹${coupon.min_order} required`);

    // Per-user limit
    if (req.user) {
      const used = await queryOne<{ c: number }>(
        'SELECT COUNT(*)::int AS c FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
        [coupon.id, req.user.sub]
      );
      if (used && used.c >= coupon.per_user_limit)
        throw ApiError.badRequest('You have already used this coupon');
    }

    const discount = computeDiscount(subtotal, {
      type: coupon.type,
      value: Number(coupon.value),
      min_order: Number(coupon.min_order),
      max_discount: coupon.max_discount != null ? Number(coupon.max_discount) : null,
    });

    res.json({
      success: true,
      data: { code: code.toUpperCase(), type: coupon.type, value: Number(coupon.value), discount },
    });
  },
};
