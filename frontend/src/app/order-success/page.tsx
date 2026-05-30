import { Suspense } from 'react';
import { OrderSuccessContent } from './success-content';

export const metadata = { title: 'Order Confirmed' };

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
