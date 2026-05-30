import type { CartItem, CartSummary } from './types';

export const STORE_CONFIG = {
  taxRate: 0.18,
  freeShippingThreshold: 999,
  defaultShippingFee: 49,
  currency: 'INR',
};

const round = (n: number) => Math.round(n * 100) / 100;

export interface AppliedCoupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discount: number;
}

/** Client-side summary mirroring the backend; backend re-computes authoritatively at checkout. */
export function computeSummary(items: CartItem[], coupon?: AppliedCoupon | null): CartSummary {
  const subtotal = round(items.reduce((s, it) => s + it.price * it.quantity, 0));
  const discount = coupon ? round(Math.min(coupon.discount, subtotal)) : 0;
  const taxable = Math.max(subtotal - discount, 0);
  const tax = round(taxable * STORE_CONFIG.taxRate);
  let shippingFee = subtotal >= STORE_CONFIG.freeShippingThreshold ? 0 : STORE_CONFIG.defaultShippingFee;
  if (subtotal === 0) shippingFee = 0;
  const total = round(taxable + tax + shippingFee);
  return { subtotal, discount, tax, shippingFee, total };
}
