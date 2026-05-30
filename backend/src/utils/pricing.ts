import { env } from '../config/env';

export interface CartLine {
  price: number;
  quantity: number;
}

export interface CouponLike {
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  max_discount: number | null;
}

export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function computeDiscount(subtotal: number, coupon: CouponLike | null): number {
  if (!coupon) return 0;
  if (subtotal < coupon.min_order) return 0;
  let discount = coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
  return round(Math.min(discount, subtotal));
}

export function computeBreakdown(
  lines: CartLine[],
  coupon: CouponLike | null,
  opts?: { shippingOverride?: number }
): PriceBreakdown {
  const subtotal = round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
  const discount = computeDiscount(subtotal, coupon);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = round(taxable * env.store.taxRate);
  let shippingFee = opts?.shippingOverride ?? env.store.defaultShippingFee;
  if (subtotal >= env.store.freeShippingThreshold) shippingFee = 0;
  if (subtotal === 0) shippingFee = 0;
  const total = round(taxable + tax + shippingFee);
  return { subtotal, discount, tax, shippingFee: round(shippingFee), total };
}

export function generateOrderNumber(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MS-${ymd}-${rand}`;
}
