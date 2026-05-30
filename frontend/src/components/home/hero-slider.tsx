'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Banner } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function HeroSlider({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const slides = banners.length ? banners : [];

  const next = useCallback(() => setIndex((i) => (i + 1) % Math.max(slides.length, 1)), [slides.length]);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, slides.length]);

  if (!slides.length) {
    return (
      <div className="container mt-4">
        <div className="flex aspect-[16/7] items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-primary-700 text-white md:aspect-[16/5]">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold md:text-5xl">Modern Shop</h1>
            <p className="mt-2 text-white/80">Premium tech at modern prices</p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/products">Shop Now</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="relative overflow-hidden rounded-2xl">
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((b) => (
            <div key={b.id} className="relative w-full shrink-0">
              <div className="relative aspect-[16/7] w-full md:aspect-[16/5]">
                <Image src={b.image_url} alt={b.title || 'Banner'} fill priority className="object-cover" sizes="100vw" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-12">
                  <div className="max-w-md text-white">
                    {b.title && <h2 className="text-2xl font-extrabold md:text-4xl">{b.title}</h2>}
                    {b.subtitle && <p className="mt-2 text-sm text-white/90 md:text-lg">{b.subtitle}</p>}
                    {b.cta_label && (
                      <Button asChild className="mt-4 w-fit">
                        <Link href={b.link_url || '/products'}>{b.cta_label}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-accent shadow hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-accent shadow hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn('h-2 rounded-full transition-all', i === index ? 'w-6 bg-white' : 'w-2 bg-white/50')}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
