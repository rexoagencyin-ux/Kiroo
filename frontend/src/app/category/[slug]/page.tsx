'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProducts } from '@/lib/store';
import { CATEGORIES, categoryName } from '@/lib/categories';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Most Popular'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['rating', 'Top Rated'],
];

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { products, loading } = useProducts(true);
  const [sort, setSort] = useState('newest');

  const cat = CATEGORIES.find((c) => c.slug === slug);

  const list = useMemo(() => {
    let l = products.filter((p) => p.category_slug === slug);
    switch (sort) {
      case 'price_asc': l = [...l].sort((a, b) => a.price - b.price); break;
      case 'price_desc': l = [...l].sort((a, b) => b.price - a.price); break;
      case 'rating': l = [...l].sort((a, b) => b.rating_avg - a.rating_avg); break;
      case 'popular': l = [...l].sort((a, b) => b.sold_count - a.sold_count); break;
    }
    return l;
  }, [products, slug, sort]);

  return (
    <div className="container py-6">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary to-primary-700 p-8 text-white">
        <h1 className="text-2xl font-extrabold md:text-3xl">{cat?.name ?? categoryName(slug)}</h1>
        <p className="mt-1 text-white/90">Explore our {(cat?.name ?? '').toLowerCase()} collection</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} products</p>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>{SORTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <ProductGridSkeleton count={10} />
      ) : list.length === 0 ? (
        <div className="rounded-lg border bg-white py-20 text-center text-muted-foreground">
          No products in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
