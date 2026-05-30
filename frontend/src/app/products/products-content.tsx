'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Category, Pagination, Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Most Popular'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['rating', 'Top Rated'],
  ['discount', 'Biggest Discount'],
];

export function ProductsContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // local filter state
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');

  const queryString = useMemo(() => params.toString(), [params]);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Category[] }>('/categories', false),
      api.get<{ data: string[] }>('/products/brands', false),
    ])
      .then(([c, b]) => {
        setCategories(c.data);
        setBrands(b.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams(queryString);
    if (!sp.get('limit')) sp.set('limit', '15');
    api
      .get<{ data: Product[]; pagination: Pagination }>(`/products?${sp.toString()}`, false)
      .then((r) => {
        setProducts(r.data);
        setPagination(r.pagination);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [queryString]);

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const sp = new URLSearchParams(queryString);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '') sp.delete(k);
        else sp.set(k, v);
      });
      if (!('page' in updates)) sp.set('page', '1');
      router.push(`/products?${sp.toString()}`);
    },
    [queryString, router]
  );

  const activeCategory = params.get('category') ?? '';
  const activeBrand = params.get('brand') ?? '';
  const activeSort = params.get('sort') ?? 'newest';
  const activeRating = params.get('rating') ?? '';
  const q = params.get('q') ?? '';

  const clearAll = () => router.push('/products');
  const hasFilters = !!(activeCategory || activeBrand || activeRating || params.get('minPrice') || params.get('maxPrice') || q);

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-semibold text-accent">Category</h3>
        <div className="space-y-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setParam({ category: activeCategory === c.slug ? null : c.slug })}
              className={cn('block w-full text-left text-sm', activeCategory === c.slug ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-accent')}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-accent">Brand</h3>
        <div className="max-h-40 space-y-1.5 overflow-y-auto">
          {brands.map((b) => (
            <button
              key={b}
              onClick={() => setParam({ brand: activeBrand === b ? null : b })}
              className={cn('block w-full text-left text-sm', activeBrand === b ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-accent')}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-accent">Price Range</h3>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-9" />
          <span className="text-muted-foreground">–</span>
          <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-9" />
        </div>
        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setParam({ minPrice, maxPrice })}>
          Apply
        </Button>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-accent">Rating</h3>
        <div className="space-y-1.5">
          {[4, 3, 2].map((r) => (
            <button
              key={r}
              onClick={() => setParam({ rating: activeRating === String(r) ? null : String(r) })}
              className={cn('block text-sm', activeRating === String(r) ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-accent')}
            >
              {r}★ & above
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <Button variant="ghost" className="w-full text-destructive" onClick={clearAll}>
          <X className="h-4 w-4" /> Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="container py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-accent md:text-2xl">
            {q ? `Results for “${q}”` : 'All Products'}
          </h1>
          {pagination && <p className="text-sm text-muted-foreground">{pagination.total} products</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </Button>
          <Select value={activeSort} onValueChange={(v) => setParam({ sort: v })}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="hidden rounded-md border sm:flex">
            <button onClick={() => setView('grid')} className={cn('p-2', view === 'grid' && 'bg-muted text-primary')} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setView('list')} className={cn('p-2', view === 'list' && 'bg-muted text-primary')} aria-label="List view">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-36 rounded-lg border bg-white p-4">{FilterPanel}</div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <ProductGridSkeleton count={15} />
          ) : products.length === 0 ? (
            <div className="rounded-lg border bg-white py-20 text-center">
              <p className="text-lg font-medium text-accent">No products found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search.</p>
              <Button className="mt-4" onClick={clearAll}>
                Reset filters
              </Button>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} view="list" />
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={pagination.page <= 1}
                onClick={() => setParam({ page: String(pagination.page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: pagination.totalPages }).slice(0, 7).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setParam({ page: String(pageNum) })}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setParam({ page: String(pagination.page + 1) })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setShowFilters(false)} aria-label="Close">
                <X className="h-6 w-6" />
              </button>
            </div>
            {FilterPanel}
            <Button className="mt-4 w-full" onClick={() => setShowFilters(false)}>
              Show results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
