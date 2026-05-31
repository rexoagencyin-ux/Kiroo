'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';
import { useProducts } from '@/lib/store';
import { CATEGORIES } from '@/lib/categories';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Most Popular'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['rating', 'Top Rated'],
];

export function ProductsContent() {
  const params = useSearchParams();
  const { products, loading } = useProducts(true);

  const initialCategory = params.get('category') ?? '';
  const initialQ = params.get('q') ?? '';
  const filter = params.get('filter') ?? '';

  const [category, setCategory] = useState(initialCategory);
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const result = useMemo(() => {
    let list = [...products];
    if (filter === 'featured') list = list.filter((p) => p.is_featured);
    if (filter === 'trending') list = list.filter((p) => p.is_trending);
    if (filter === 'new') list = list.filter((p) => p.is_new_arrival);
    if (filter === 'flash') list = list.filter((p) => p.is_flash_sale);
    if (category) list = list.filter((p) => p.category_slug === category);
    if (q) {
      const t = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t) || (p.brand ?? '').toLowerCase().includes(t));
    }
    if (minPrice) list = list.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));
    switch (sort) {
      case 'price_asc': list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating': list.sort((a, b) => b.rating_avg - a.rating_avg); break;
      case 'popular': list.sort((a, b) => b.sold_count - a.sold_count); break;
      default: break;
    }
    return list;
  }, [products, filter, category, q, minPrice, maxPrice, sort]);

  const clearAll = () => { setCategory(''); setQ(''); setMinPrice(''); setMaxPrice(''); };
  const hasFilters = !!(category || q || minPrice || maxPrice);

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-semibold text-accent">Category</h3>
        <div className="space-y-1.5">
          <button onClick={() => setCategory('')} className={cn('block w-full text-left text-sm', !category ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-accent')}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.slug} onClick={() => setCategory(category === c.slug ? '' : c.slug)}
              className={cn('block w-full text-left text-sm', category === c.slug ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-accent')}>
              {c.name}
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
      </div>
      {hasFilters && <Button variant="ghost" className="w-full text-destructive" onClick={clearAll}><X className="h-4 w-4" /> Clear filters</Button>}
    </div>
  );

  return (
    <div className="container py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-accent md:text-2xl">{q ? `Results for “${q}”` : 'All Products'}</h1>
          <p className="text-sm text-muted-foreground">{result.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters(true)}><SlidersHorizontal className="h-4 w-4" /> Filters</Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <div className="hidden rounded-md border sm:flex">
            <button onClick={() => setView('grid')} className={cn('p-2', view === 'grid' && 'bg-muted text-primary')} aria-label="Grid"><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setView('list')} className={cn('p-2', view === 'list' && 'bg-muted text-primary')} aria-label="List"><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="mb-4 lg:hidden">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" />
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-36 rounded-lg border bg-white p-4">{FilterPanel}</div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <ProductGridSkeleton count={12} />
          ) : result.length === 0 ? (
            <div className="rounded-lg border bg-white py-20 text-center">
              <p className="text-lg font-medium text-accent">No products found</p>
              <p className="text-sm text-muted-foreground">Try adjusting filters, or add products from the admin panel.</p>
              {hasFilters && <Button className="mt-4" onClick={clearAll}>Reset filters</Button>}
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {result.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="space-y-3">{result.map((p) => <ProductCard key={p.id} product={p} view="list" />)}</div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setShowFilters(false)} aria-label="Close"><X className="h-6 w-6" /></button>
            </div>
            {FilterPanel}
            <Button className="mt-4 w-full" onClick={() => setShowFilters(false)}>Show {result.length} results</Button>
          </div>
        </div>
      )}
    </div>
  );
}
