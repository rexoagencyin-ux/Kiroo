'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { CreditCard, Banknote, Plus, MapPin, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { useToast } from '@/components/providers/toast-provider';
import { api, ApiError } from '@/lib/api';
import { Address } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn, formatPrice } from '@/lib/utils';
import { STORE_CONFIG } from '@/lib/pricing';
import { loadRazorpay, RazorpayResponse } from '@/lib/razorpay';

const empty = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India' };

export function CheckoutContent() {
  const { user, loading: authLoading } = useAuth();
  const { items, summary, coupon, applyCoupon, clear } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [payment, setPayment] = useState<'razorpay' | 'cod'>('razorpay');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/checkout');
      return;
    }
    api
      .get<{ data: Address[] }>('/addresses')
      .then((r) => {
        setAddresses(r.data);
        const def = r.data.find((a) => a.is_default) ?? r.data[0];
        if (def) setSelectedAddr(def.id);
        else setShowForm(true);
      })
      .catch(() => setShowForm(true));
  }, [user, authLoading, router]);

  // Re-validate coupon from query on mount
  useEffect(() => {
    const code = params.get('coupon');
    if (code && !coupon && summary.subtotal > 0) {
      api
        .post<{ data: { code: string; type: 'percentage' | 'fixed'; value: number; discount: number } }>(
          '/coupons/validate',
          { code, subtotal: summary.subtotal },
          false
        )
        .then((r) => applyCoupon(r.data))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, summary.subtotal]);

  const saveAddress = async () => {
    try {
      const res = await api.post<{ data: Address }>('/addresses', { ...form, is_default: addresses.length === 0 });
      setAddresses((a) => [...a, res.data]);
      setSelectedAddr(res.data.id);
      setShowForm(false);
      setForm(empty);
      toast('Address saved', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save address', 'error');
    }
  };

  const placeOrder = async () => {
    if (!selectedAddr) {
      toast('Please select or add a delivery address', 'error');
      return;
    }
    if (items.length === 0) {
      toast('Your cart is empty', 'error');
      return;
    }
    setPlacing(true);
    try {
      const orderRes = await api.post<{ order: { id: string; order_number: string; total: number } }>('/orders', {
        paymentMethod: payment,
        addressId: selectedAddr,
        couponCode: coupon?.code,
      });
      const order = orderRes.order;

      if (payment === 'cod') {
        await clear();
        toast('Order placed successfully!', 'success');
        router.push(`/order-success?order=${order.order_number}`);
        return;
      }

      // Razorpay flow
      const ok = await loadRazorpay();
      if (!ok) {
        toast('Failed to load payment gateway', 'error');
        setPlacing(false);
        return;
      }
      const rzp = await api.post<{ keyId: string; razorpayOrderId: string; amount: number; currency: string }>(
        '/payments/create-order',
        { orderId: order.id }
      );

      const instance = new window.Razorpay!({
        key: rzp.keyId,
        amount: rzp.amount,
        currency: rzp.currency,
        name: 'Modern Shop',
        description: `Order ${order.order_number}`,
        order_id: rzp.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone ?? undefined },
        theme: { color: '#4CAF50' },
        handler: async (response: RazorpayResponse) => {
          try {
            await api.post('/payments/verify', {
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await clear();
            toast('Payment successful!', 'success');
            router.push(`/order-success?order=${order.order_number}`);
          } catch {
            toast('Payment verification failed', 'error');
            router.push(`/profile/orders`);
          }
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
            toast('Payment cancelled', 'info');
          },
        },
      });
      instance.open();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not place order', 'error');
      setPlacing(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="container flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="mb-6 text-2xl font-bold text-accent">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Addresses */}
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-accent">
              <MapPin className="h-5 w-5 text-primary" /> Delivery Address
            </h2>
            <div className="space-y-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAddr(a.id)}
                  className={cn('flex w-full items-start gap-3 rounded-md border p-3 text-left', selectedAddr === a.id ? 'border-primary bg-primary-50' : 'border-input')}
                >
                  <div className={cn('mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border', selectedAddr === a.id ? 'border-primary bg-primary text-white' : 'border-muted-foreground')}>
                    {selectedAddr === a.id && <Check className="h-3 w-3" />}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-accent">{a.full_name} · {a.phone}</p>
                    <p className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postal_code}</p>
                  </div>
                </button>
              ))}
            </div>

            {showForm ? (
              <div className="mt-3 grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Pincode</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Address line 1</Label><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Address line 2 (optional)</Label><Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={saveAddress}>Save address</Button>
                  {addresses.length > 0 && <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>}
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Add new address
              </Button>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 font-semibold text-accent">Payment Method</h2>
            <div className="space-y-2">
              <button onClick={() => setPayment('razorpay')} className={cn('flex w-full items-center gap-3 rounded-md border p-3 text-left', payment === 'razorpay' ? 'border-primary bg-primary-50' : 'border-input')}>
                <CreditCard className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-accent">Pay Online (Razorpay)</p>
                  <p className="text-muted-foreground">UPI, cards, netbanking & wallets</p>
                </div>
              </button>
              <button onClick={() => setPayment('cod')} className={cn('flex w-full items-center gap-3 rounded-md border p-3 text-left', payment === 'cod' ? 'border-primary bg-primary-50' : 'border-input')}>
                <Banknote className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-accent">Cash on Delivery</p>
                  <p className="text-muted-foreground">Pay when your order arrives</p>
                </div>
              </button>
            </div>
          </section>
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-36 rounded-lg border bg-white p-5">
            <h2 className="font-semibold text-accent">Order Summary</h2>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 text-sm">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    <Image src={it.image || '/placeholder.png'} alt={it.name} fill className="object-cover" sizes="40px" />
                  </div>
                  <span className="flex-1 truncate">{it.name} × {it.quantity}</span>
                  <span>{formatPrice(it.lineTotal)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(summary.subtotal)}</span></div>
              {summary.discount > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>-{formatPrice(summary.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPrice(summary.tax)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{summary.shippingFee === 0 ? <span className="text-primary">FREE</span> : formatPrice(summary.shippingFee)}</span></div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-lg font-bold text-accent"><span>Total</span><span>{formatPrice(summary.total)}</span></div>
            <Button className="mt-5 w-full" size="lg" onClick={placeOrder} loading={placing}>
              {payment === 'cod' ? 'Place Order' : `Pay ${formatPrice(summary.total)}`}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">By placing your order you agree to our terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
