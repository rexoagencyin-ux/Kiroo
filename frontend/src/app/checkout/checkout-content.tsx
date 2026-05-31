'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Banknote, CreditCard, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { useToast } from '@/components/providers/toast-provider';
import { createOrder } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn, formatPrice } from '@/lib/utils';

const ADDR_KEY = 'ms_address';
const empty = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India' };

export function CheckoutContent() {
  const { user, loading: authLoading } = useAuth();
  const { items, summary, clear } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  const [address, setAddress] = useState(empty);
  const [payment, setPayment] = useState<'cod' | 'razorpay'>('cod');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/checkout');
      return;
    }
    setAddress((a) => ({ ...a, full_name: a.full_name || user.name, phone: a.phone || (user.phone ?? '') }));
    try {
      const saved = localStorage.getItem(ADDR_KEY);
      if (saved) setAddress((a) => ({ ...a, ...JSON.parse(saved) }));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const valid = address.full_name && address.phone && address.line1 && address.city && address.state && address.postal_code;

  const placeOrder = async () => {
    if (!user) return;
    if (!valid) return toast('Please fill in your delivery address', 'error');
    if (items.length === 0) return toast('Your cart is empty', 'error');
    if (payment === 'razorpay') {
      toast('Online payment needs the API backend. Please use Cash on Delivery for now.', 'info');
      return;
    }
    setPlacing(true);
    try {
      localStorage.setItem(ADDR_KEY, JSON.stringify(address));
      const { order_number } = await createOrder({
        user_id: user.id,
        user_email: user.email,
        user_name: user.name,
        items: items.map((it) => ({
          product_id: it.product_id,
          name: it.name,
          image: it.image,
          price: it.price,
          quantity: it.quantity,
          total: it.lineTotal,
        })),
        subtotal: summary.subtotal,
        discount: summary.discount,
        tax: summary.tax,
        shipping_fee: summary.shippingFee,
        total: summary.total,
        payment_method: 'cod',
        payment_status: 'pending',
        status: 'confirmed',
        shipping_address: address,
      });
      await clear();
      toast('Order placed successfully! 🎉', 'success');
      router.push(`/order-success?order=${order_number}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not place order', 'error');
      setPlacing(false);
    }
  };

  if (authLoading || !user) {
    return <div className="container flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg font-medium text-accent">Your cart is empty</p>
        <Button className="mt-4" onClick={() => router.push('/products')}>Shop products</Button>
      </div>
    );
  }

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setAddress({ ...address, [k]: e.target.value });

  return (
    <div className="container py-6">
      <h1 className="mb-6 text-2xl font-bold text-accent">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-accent"><MapPin className="h-5 w-5 text-primary" /> Delivery Address</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Full name</Label><Input value={address.full_name} onChange={set('full_name')} /></div>
              <div><Label>Phone</Label><Input value={address.phone} onChange={set('phone')} /></div>
              <div><Label>Pincode</Label><Input value={address.postal_code} onChange={set('postal_code')} /></div>
              <div className="sm:col-span-2"><Label>Address line 1</Label><Input value={address.line1} onChange={set('line1')} /></div>
              <div className="sm:col-span-2"><Label>Address line 2 (optional)</Label><Input value={address.line2} onChange={set('line2')} /></div>
              <div><Label>City</Label><Input value={address.city} onChange={set('city')} /></div>
              <div><Label>State</Label><Input value={address.state} onChange={set('state')} /></div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-5">
            <h2 className="mb-3 font-semibold text-accent">Payment Method</h2>
            <div className="space-y-2">
              <button onClick={() => setPayment('cod')} className={cn('flex w-full items-center gap-3 rounded-md border p-3 text-left', payment === 'cod' ? 'border-primary bg-primary-50' : 'border-input')}>
                <Banknote className="h-5 w-5 text-primary" />
                <div className="text-sm"><p className="font-medium text-accent">Cash on Delivery</p><p className="text-muted-foreground">Pay when your order arrives</p></div>
              </button>
              <button onClick={() => setPayment('razorpay')} className={cn('flex w-full items-center gap-3 rounded-md border p-3 text-left opacity-70', payment === 'razorpay' ? 'border-primary bg-primary-50' : 'border-input')}>
                <CreditCard className="h-5 w-5 text-primary" />
                <div className="text-sm"><p className="font-medium text-accent">Pay Online (Razorpay)</p><p className="text-muted-foreground">Enable after connecting payment backend</p></div>
              </button>
            </div>
          </section>
        </div>

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
            <Button className="mt-5 w-full" size="lg" onClick={placeOrder} loading={placing}>Place Order</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
