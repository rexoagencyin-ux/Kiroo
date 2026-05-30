import { Suspense } from 'react';
import { CheckoutContent } from './checkout-content';

export const metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center text-muted-foreground">Loading…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
