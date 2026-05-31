'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, Clock } from 'lucide-react';
import { useProducts } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

const HISTORY_KEY = 'ms_search_history';

export function SearchBar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { products } = useProducts(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const matches = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(t) || (p.brand ?? '').toLowerCase().includes(t))
      .slice(0, 6);
  }, [query, products]);

  const saveHistory = (term: string) => {
    const next = [term, ...history.filter((h) => h !== term)].slice(0, 8);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const submit = (term: string) => {
    if (!term.trim()) return;
    saveHistory(term.trim());
    setOpen(false);
    onNavigate?.();
    router.push(`/products?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={(e) => { e.preventDefault(); submit(query); }} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search smart watches, earbuds, cameras…"
          className="h-10 w-full rounded-full border border-input bg-muted/60 pl-10 pr-9 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          aria-label="Search products"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-lg border bg-white p-2 shadow-xl">
          {!query && history.length > 0 && (
            <div className="p-1">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Clock className="h-3 w-3" /> Recent</p>
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <button key={h} onClick={() => submit(h)} className="rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/70">{h}</button>
                ))}
              </div>
            </div>
          )}
          {!query && history.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Start typing to search products.</p>
          )}
          {query && matches.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No results for “{query}”.</p>
          )}
          {matches.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              onClick={() => { setOpen(false); onNavigate?.(); }}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} fill className="object-cover" sizes="40px" />
              </div>
              <span className="flex-1 truncate text-sm">{p.name}</span>
              <span className="text-sm font-semibold">{formatPrice(p.effective_price ?? p.price)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
