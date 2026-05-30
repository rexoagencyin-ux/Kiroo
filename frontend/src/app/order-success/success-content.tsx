'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OrderSuccessContent() {
  const params = useSearchParams();
  const orderNumber = params.get('order');

  return (
    <div className="container flex flex-col items-center py-20 text-center">
      <div className="rounded-full bg-primary-50 p-4">
        <CheckCircle2 className="h-16 w-16 text-primary" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-accent">Thank you for your order!</h1>
      <p className="mt-2 text-muted-foreground">
        Your order has been placed successfully. A confirmation email is on its way.
      </p>
      {orderNumber && (
        <p className="mt-1 font-mono text-sm font-semibold text-accent">Order #{orderNumber}</p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {orderNumber && (
          <Button asChild>
            <Link href={`/track/${orderNumber}`}>
              <Package className="h-4 w-4" /> Track Order
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/products">
            <ShoppingBag className="h-4 w-4" /> Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}
