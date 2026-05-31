'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  orderBy,
  limit as fbLimit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDb, getFirebaseStorage } from './firebase';
import { slugify } from './slug';
import { categoryName } from './categories';
import type { Product, Order } from './types';

const PRODUCTS = 'products';
const ORDERS = 'orders';

/* ----------------------------------------------------------------- mapping */

function toProduct(id: string, d: Record<string, unknown>): Product {
  const price = Number(d.price ?? 0);
  const flash = d.flash_price != null ? Number(d.flash_price) : null;
  return {
    id,
    name: String(d.name ?? ''),
    slug: String(d.slug ?? id),
    description: (d.description as string) ?? '',
    short_desc: (d.short_desc as string) ?? '',
    brand: (d.brand as string) ?? '',
    category_id: (d.category as string) ?? null,
    category_name: (d.category_name as string) ?? categoryName(String(d.category ?? '')),
    category_slug: (d.category as string) ?? '',
    price,
    compare_price: d.compare_price != null ? Number(d.compare_price) : null,
    flash_price: flash,
    effective_price: d.is_flash_sale && flash ? flash : price,
    sku: (d.sku as string) ?? null,
    stock: Number(d.stock ?? 0),
    low_stock_threshold: Number(d.low_stock_threshold ?? 5),
    images: Array.isArray(d.images) ? (d.images as string[]) : [],
    specifications: (d.specifications as Record<string, string>) ?? {},
    variants: Array.isArray(d.variants) ? (d.variants as Product['variants']) : [],
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    rating_avg: Number(d.rating_avg ?? 0),
    rating_count: Number(d.rating_count ?? 0),
    is_featured: !!d.is_featured,
    is_trending: !!d.is_trending,
    is_new_arrival: !!d.is_new_arrival,
    is_flash_sale: !!d.is_flash_sale,
    flash_ends_at: (d.flash_ends_at as string) ?? null,
    sold_count: Number(d.sold_count ?? 0),
    is_active: d.is_active !== false,
  };
}

function toOrder(id: string, d: Record<string, unknown>): Order {
  const created = d.created_at as { toDate?: () => Date } | undefined;
  return {
    id,
    order_number: String(d.order_number ?? id),
    status: String(d.status ?? 'pending'),
    payment_method: (d.payment_method as 'razorpay' | 'cod') ?? 'cod',
    payment_status: String(d.payment_status ?? 'pending'),
    subtotal: Number(d.subtotal ?? 0),
    discount: Number(d.discount ?? 0),
    tax: Number(d.tax ?? 0),
    shipping_fee: Number(d.shipping_fee ?? 0),
    total: Number(d.total ?? 0),
    coupon_code: (d.coupon_code as string) ?? null,
    shipping_address: (d.shipping_address as Order['shipping_address']) ?? ({} as Order['shipping_address']),
    tracking_number: (d.tracking_number as string) ?? null,
    courier: (d.courier as string) ?? null,
    created_at: created?.toDate ? created.toDate().toISOString() : (d.created_at as string) ?? new Date().toISOString(),
    delivered_at: null,
    items: (d.items as Order['items']) ?? [],
    // extra fields used by admin views
    ...(d as object),
  } as Order;
}

/* ------------------------------------------------------------- image upload */

export async function uploadImage(file: File): Promise<string> {
  const storage = getFirebaseStorage();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '-')}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

/* ----------------------------------------------------------------- products */

export interface ProductInput {
  name: string;
  description?: string;
  short_desc?: string;
  brand?: string;
  category?: string; // slug
  price: number;
  compare_price?: number | null;
  flash_price?: number | null;
  stock: number;
  images: string[];
  specifications?: Record<string, string>;
  tags?: string[];
  is_featured?: boolean;
  is_trending?: boolean;
  is_new_arrival?: boolean;
  is_flash_sale?: boolean;
  is_active?: boolean;
}

export async function createProduct(input: ProductInput): Promise<string> {
  const db = getDb();
  const payload = {
    ...input,
    slug: `${slugify(input.name) || 'product'}-${Date.now().toString(36)}`,
    category_name: categoryName(input.category ?? ''),
    rating_avg: 0,
    rating_count: 0,
    sold_count: 0,
    is_active: input.is_active !== false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  const r = await addDoc(collection(db, PRODUCTS), payload);
  return r.id;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  const db = getDb();
  const data: Record<string, unknown> = { ...patch, updated_at: serverTimestamp() };
  if (patch.category) data.category_name = categoryName(patch.category);
  if (patch.name) data.slug = `${slugify(patch.name)}-${id.slice(0, 5)}`;
  await updateDoc(doc(db, PRODUCTS, id), data);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), PRODUCTS, id));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = getDb();
  const snap = await getDocs(query(collection(db, PRODUCTS), where('slug', '==', slug), fbLimit(1)));
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return toProduct(docSnap.id, docSnap.data());
}

export async function getRelated(category: string, excludeId: string): Promise<Product[]> {
  const db = getDb();
  const snap = await getDocs(query(collection(db, PRODUCTS), where('category', '==', category), fbLimit(8)));
  return snap.docs.map((s) => toProduct(s.id, s.data())).filter((p) => p.id !== excludeId && p.is_active);
}

/** Real-time subscription to ALL active products (storefront). */
function subscribe(activeOnly: boolean, cb: (products: Product[]) => void): () => void {
  const db = getDb();
  const col = collection(db, PRODUCTS);
  const q = activeOnly ? query(col, where('is_active', '==', true)) : query(col);
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((s) => toProduct(s.id, s.data()));
      rows.sort((a, b) => (a.name > b.name ? 1 : -1));
      cb(rows);
    },
    () => cb([])
  );
}

/* ----------------------------------------------------------------- hooks */

export function useProducts(activeOnly = true) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = subscribe(activeOnly, (rows) => {
      setProducts(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [activeOnly]);
  return { products, loading };
}

/* ----------------------------------------------------------------- orders */

export function generateOrderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `MS-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export interface CreateOrderInput {
  user_id: string | null;
  user_email: string;
  user_name: string;
  items: { product_id: string; name: string; image: string | null; price: number; quantity: number; total: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping_fee: number;
  total: number;
  payment_method: 'razorpay' | 'cod';
  payment_status: string;
  status: string;
  shipping_address: Record<string, string>;
}

export async function createOrder(input: CreateOrderInput): Promise<{ id: string; order_number: string }> {
  const db = getDb();
  const order_number = generateOrderNumber();
  const r = await addDoc(collection(db, ORDERS), { ...input, order_number, created_at: serverTimestamp() });
  // decrement stock + bump sold_count (best-effort)
  await Promise.all(
    input.items.map((it) =>
      updateDoc(doc(db, PRODUCTS, it.product_id), {
        stock: increment(-it.quantity),
        sold_count: increment(it.quantity),
      }).catch(() => undefined)
    )
  );
  return { id: r.id, order_number };
}

export async function updateOrderStatus(
  id: string,
  patch: { status?: string; payment_status?: string; tracking_number?: string; courier?: string }
): Promise<void> {
  await updateDoc(doc(getDb(), ORDERS, id), { ...patch, updated_at: serverTimestamp() });
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const db = getDb();
  const snap = await getDocs(query(collection(db, ORDERS), where('order_number', '==', orderNumber), fbLimit(1)));
  if (snap.empty) return null;
  return toOrder(snap.docs[0].id, snap.docs[0].data());
}

export function useAllOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(
      query(collection(db, ORDERS), orderBy('created_at', 'desc')),
      (snap) => {
        setOrders(snap.docs.map((s) => toOrder(s.id, s.data())));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);
  return { orders, loading };
}

export function useUserOrders(userId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    const unsub = onSnapshot(
      query(collection(db, ORDERS), where('user_id', '==', userId)),
      (snap) => {
        const rows = snap.docs.map((s) => toOrder(s.id, s.data()));
        rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        setOrders(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [userId]);
  return { orders, loading };
}
