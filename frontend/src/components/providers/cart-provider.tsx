'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem, CartSummary, Product } from '@/lib/types';
import { AppliedCoupon, computeSummary } from '@/lib/pricing';

const GUEST_KEY = 'ms_cart';

interface CartLine {
  product_id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  quantity: number;
  stock: number;
  variant: string | null;
}

interface CartContextValue {
  items: CartItem[];
  summary: CartSummary;
  count: number;
  coupon: AppliedCoupon | null;
  loading: boolean;
  add: (product: Product, quantity?: number, variant?: string | null) => Promise<void>;
  updateQty: (item: CartItem, quantity: number) => Promise<void>;
  remove: (item: CartItem) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (coupon: AppliedCoupon | null) => void;
  reload: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

function readCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeCart(lines: CartLine[]) {
  if (typeof window !== 'undefined') localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
}
function toItems(lines: CartLine[]): CartItem[] {
  return lines.map((l, i) => ({
    id: `${l.product_id}-${l.variant ?? ''}-${i}`,
    product_id: l.product_id,
    name: l.name,
    slug: l.slug,
    image: l.image,
    variant: l.variant,
    price: l.price,
    quantity: l.quantity,
    stock: l.stock,
    lineTotal: Math.round(l.price * l.quantity * 100) / 100,
  }));
}

/**
 * Client-side cart backed by localStorage. Works fully without a backend.
 * (When the API backend is deployed you can switch this to server-synced.)
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [loading, setLoading] = useState(true);

  const sync = () => setItems(toItems(readCart()));

  const reload = async () => {
    sync();
  };

  useEffect(() => {
    sync();
    setLoading(false);
  }, []);

  const add = async (product: Product, quantity = 1, variant: string | null = null) => {
    const lines = readCart();
    const price = product.is_flash_sale && product.flash_price ? product.flash_price : product.price;
    const existing = lines.find((l) => l.product_id === product.id && l.variant === variant);
    if (existing) existing.quantity += quantity;
    else
      lines.push({
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] ?? null,
        price,
        quantity,
        stock: product.stock,
        variant,
      });
    writeCart(lines);
    sync();
  };

  const updateQty = async (item: CartItem, quantity: number) => {
    if (quantity < 1) return;
    const lines = readCart();
    const found = lines.find((l) => l.product_id === item.product_id && l.variant === item.variant);
    if (found) found.quantity = quantity;
    writeCart(lines);
    sync();
  };

  const remove = async (item: CartItem) => {
    const lines = readCart().filter(
      (l) => !(l.product_id === item.product_id && l.variant === item.variant)
    );
    writeCart(lines);
    sync();
  };

  const clear = async () => {
    writeCart([]);
    setItems([]);
    setCoupon(null);
  };

  const summary = computeSummary(items, coupon);
  const count = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, summary, count, coupon, loading, add, updateQty, remove, clear, applyCoupon: setCoupon, reload }}
    >
      {children}
    </CartContext.Provider>
  );
}
