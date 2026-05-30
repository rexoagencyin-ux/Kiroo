'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight, X } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { api, ApiError } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { STORE_CONFIG } from '@/lib/pricing';

export default function CartPage() {
  const { items, summary, updateQty, remove, coupon, applyCoupon, loading } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  const applyCode = async () => {
    if (!code.trim()) return;
    setApplying(true);
    try {
      const res = await api.post<{ data: { code: string; type: 'percentage' | 'fixed'; value: number; discount: number } }>(
        '/coupons/validate',
        { code, subtotal: summary.subtotal },
        false
      );
      applyCoupon(res.data);
      toast(`Coupon ${res.data.code} applied!`, 'success');
    } catch (err) {
      applyCoupon(null);
      toast(err instanceof ApiError ? err.message : 'Invalid coupon', 'error');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="container py-20 text-center text-muted-foreground">Loading your cart…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container flex flex-col items-center py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="mt-4 text-xl font-bold text-accent">Your cart is empty</h1>
        <p className="mt-1 text-muted-foreground">Looks like you haven&apos;t added anything yet.</p>
        <Button asChild className="mt-6">
          <Link href="/products">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="mb-6 text-2xl font-bold text-accent">Shopping Cart</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-lg border bg-white p-3">
              <Link href={`/product/${item.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image src={item.image || '/placeholder.png'} alt={item.name} fill className="object-cover" sizes="96px" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/product/${item.slug}`} className="font-medium text-accent hover:text-primary line-clamp-2">
                    {item.name}
                  </Link>
                  <button onClick={() => remove(item)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-md border">
                    <button onClick={() => updateQty(item, item.quantity - 1)} disabled={item.quantity <= 1} className="p-2" aria-label="Decrease">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item, item.quantity + 1)} disabled={item.quantity >= item.stock} className="p-2" aria-label="Increase">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-semibold text-accent">{formatPrice(item.lineTotal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-36 rounded-lg border bg-white p-5">
            <h2 className="font-semibold text-accent">Order Summary</h2>

            <div className="mt-4">
              {coupon ? (
                <div className="flex items-center justify-between rounded-md bg-primary-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1 text-primary-700">
                    <Tag className="h-4 w-4" /> {coupon.code} applied
                  </span>
                  <button onClick={() => applyCoupon(null)} aria-label="Remove coupon">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-9" />
                  <Button size="sm" variant="outline" onClick={applyCode} loading={applying}>
                    Apply
                  </Button>
                </div>
              )}
            </div>

            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(summary.subtotal)}</span>
              </div>
              {summary.discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Discount</span>
                  <span>-{formatPrice(summary.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (GST {Math.round(STORE_CONFIG.taxRate * 100)}%)</span>
                <span>{formatPrice(summary.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{summary.shippingFee === 0 ? <span className="text-primary">FREE</span> : formatPrice(summary.shippingFee)}</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-lg font-bold text-accent">
              <span>Total</span>
              <span>{formatPrice(summary.total)}</span>
            </div>

            <Button className="mt-5 w-full" size="lg" onClick={() => router.push(`/checkout${coupon ? `?coupon=${coupon.code}` : ''}`)}>
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/products">Continue shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
