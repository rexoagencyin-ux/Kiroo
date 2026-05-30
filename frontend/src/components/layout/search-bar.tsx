'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface SearchResult {
  products: { id: string; name: string; slug: string; price: number; flash_price: number | null; is_flash_sale: boolean; images: string[] }[];
  suggestions: string[];
  categories: { id: string; name: string; slug: string }[];
}

export function SearchBar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    api.get<{ data: string[] }>('/search/trending', false).then((r) => setTrending(r.data)).catch(() => {});
    if (getToken()) {
      api.get<{ data: string[] }>('/search/history').then((r) => setHistory(r.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get<SearchResult>(`/search?q=${encodeURIComponent(query)}`, false);
        setResults(r);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const submit = (term: string) => {
    if (!term.trim()) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/products?q=${encodeURIComponent(term)}`);
  };

  return (
    <div ref={ref} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        className="relative"
      >
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
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-lg border bg-white p-2 shadow-xl">
          {loading && (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}

          {!query && (
            <div className="space-y-3 p-2">
              {history.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-3 w-3" /> Recent
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {history.map((h) => (
                      <button
                        key={h}
                        onClick={() => submit(h)}
                        className="rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/70"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {trending.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> Trending
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {trending.map((t) => (
                      <button
                        key={t}
                        onClick={() => submit(t)}
                        className="rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700 hover:bg-primary-100"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {history.length === 0 && trending.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">Start typing to search products.</p>
              )}
            </div>
          )}

          {results && query && (
            <div className="space-y-2">
              {results.suggestions.length > 0 && (
                <div className="px-1">
                  {results.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground" /> {s}
                    </button>
                  ))}
                </div>
              )}
              {results.products.length > 0 && (
                <div className="border-t pt-2">
                  {results.products.map((p) => {
                    const price = p.is_flash_sale && p.flash_price ? p.flash_price : p.price;
                    return (
                      <Link
                        key={p.id}
                        href={`/product/${p.slug}`}
                        onClick={() => {
                          setOpen(false);
                          onNavigate?.();
                        }}
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                          <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} fill className="object-cover" sizes="40px" />
                        </div>
                        <span className="flex-1 truncate text-sm">{p.name}</span>
                        <span className="text-sm font-semibold">{formatPrice(price)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
              {results.products.length === 0 && results.suggestions.length === 0 && !loading && (
                <p className="p-3 text-sm text-muted-foreground">No results for “{query}”.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
