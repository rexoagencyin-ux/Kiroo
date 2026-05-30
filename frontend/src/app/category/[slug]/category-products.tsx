'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Pagination, Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Most Popular'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['rating', 'Top Rated'],
];

export function CategoryProducts({ slug }: { slug: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: Product[]; pagination: Pagination }>(
        `/products?category=${slug}&sort=${sort}&page=${page}&limit=20`,
        false
      )
      .then((r) => {
        setProducts((prev) => (page === 1 ? r.data : [...prev, ...r.data]));
        setPagination(r.pagination);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug, sort, page]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{pagination?.total ?? 0} products</p>
        <Select
          value={sort}
          onValueChange={(v) => {
            setPage(1);
            setSort(v);
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && page === 1 ? (
        <ProductGridSkeleton count={10} />
      ) : products.length === 0 ? (
        <div className="rounded-lg border bg-white py-20 text-center text-muted-foreground">
          No products in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {pagination && pagination.page < pagination.totalPages && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" loading={loading} onClick={() => setPage((p) => p + 1)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
