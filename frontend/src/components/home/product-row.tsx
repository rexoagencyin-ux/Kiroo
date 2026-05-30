'use client';

import { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';

export function ProductRow({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.slice(0, 10).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
