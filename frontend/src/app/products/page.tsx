import { Suspense } from 'react';
import { ProductsContent } from './products-content';
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton';

export const metadata = {
  title: 'All Products',
  description: 'Browse smart watches, earbuds, cameras, projectors, gadgets and more.',
};

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-6">
          <ProductGridSkeleton count={15} />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
