'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';

function useCountdown(target: string | null) {
  const [time, setTime] = useState('');
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setTime('00:00:00');
        return;
      }
      const h = Math.floor(diff / 3.6e6);
      const m = Math.floor((diff % 3.6e6) / 6e4);
      const s = Math.floor((diff % 6e4) / 1000);
      setTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  return time;
}

export function FlashSale({ products }: { products: Product[] }) {
  const endsAt = products.find((p) => p.flash_ends_at)?.flash_ends_at ?? null;
  const countdown = useCountdown(endsAt);

  if (!products.length) return null;

  return (
    <section className="container mt-10">
      <div className="rounded-2xl bg-gradient-to-r from-accent to-[#2b2b2b] p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white">
            <Zap className="h-6 w-6 fill-primary text-primary" />
            <h2 className="text-xl font-extrabold md:text-2xl">Flash Sale</h2>
          </div>
          {endsAt && (
            <div className="flex items-center gap-2 text-sm text-white">
              <span className="text-white/70">Ends in</span>
              <span className="rounded-md bg-primary px-3 py-1 font-mono font-bold tabular-nums">{countdown}</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.slice(0, 5).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
