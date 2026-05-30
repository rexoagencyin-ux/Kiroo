'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CartItem, CartSummary, Product } from '@/lib/types';
import { AppliedCoupon, computeSummary } from '@/lib/pricing';
import { useAuth } from './auth-provider';

const GUEST_KEY = 'ms_guest_cart';

interface GuestLine {
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

function readGuest(): GuestLine[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeGuest(lines: GuestLine[]) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
}
function toCartItems(lines: GuestLine[]): CartItem[] {
  return lines.map((l, i) => ({
    id: `guest-${l.product_id}-${l.variant ?? ''}-${i}`,
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [loading, setLoading] = useState(true);

  const loadServer = useCallback(async () => {
    const res = await api.get<{ items: CartItem[] }>('/cart');
    setItems(res.items);
  }, []);

  const loadGuest = useCallback(() => {
    setItems(toCartItems(readGuest()));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (user) await loadServer();
      else loadGuest();
    } catch {
      loadGuest();
    } finally {
      setLoading(false);
    }
  }, [user, loadServer, loadGuest]);

  // On login: merge guest cart into server cart, then load server cart.
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      setLoading(true);
      try {
        if (user) {
          const guest = readGuest();
          if (guest.length) {
            await api.post('/cart/merge', {
              items: guest.map((g) => ({ productId: g.product_id, quantity: g.quantity, variant: g.variant })),
            });
            writeGuest([]);
          }
          await loadServer();
        } else {
          loadGuest();
        }
      } catch {
        loadGuest();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const add = async (product: Product, quantity = 1, variant: string | null = null) => {
    if (user) {
      await api.post('/cart', { productId: product.id, quantity, variant: variant ?? undefined });
      await loadServer();
    } else {
      const lines = readGuest();
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
      writeGuest(lines);
      loadGuest();
    }
  };

  const updateQty = async (item: CartItem, quantity: number) => {
    if (quantity < 1) return;
    if (user) {
      await api.patch(`/cart/${item.id}`, { quantity });
      await loadServer();
    } else {
      const lines = readGuest();
      const found = lines.find((l) => l.product_id === item.product_id && l.variant === item.variant);
      if (found) found.quantity = quantity;
      writeGuest(lines);
      loadGuest();
    }
  };

  const remove = async (item: CartItem) => {
    if (user) {
      await api.delete(`/cart/${item.id}`);
      await loadServer();
    } else {
      const lines = readGuest().filter(
        (l) => !(l.product_id === item.product_id && l.variant === item.variant)
      );
      writeGuest(lines);
      loadGuest();
    }
  };

  const clear = async () => {
    if (user) {
      await api.delete('/cart');
      setItems([]);
    } else {
      writeGuest([]);
      setItems([]);
    }
    setCoupon(null);
  };

  const summary = computeSummary(items, coupon);
  const count = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        count,
        coupon,
        loading,
        add,
        updateQty,
        remove,
        clear,
        applyCoupon: setCoupon,
        reload,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
