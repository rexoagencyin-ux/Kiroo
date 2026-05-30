import Image from 'next/image';
import Link from 'next/link';
import { Banner } from '@/lib/types';

export function PromoBanners({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;
  return (
    <section className="container mt-10">
      <div className="grid gap-4 md:grid-cols-2">
        {banners.slice(0, 2).map((b) => (
          <Link key={b.id} href={b.link_url || '/products'} className="group relative overflow-hidden rounded-2xl">
            <div className="relative aspect-[2/1] w-full">
              <Image src={b.image_url} alt={b.title || 'Promo'} fill className="object-cover transition group-hover:scale-105" sizes="(max-width:768px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5 text-white">
                {b.title && <h3 className="text-lg font-bold md:text-xl">{b.title}</h3>}
                {b.subtitle && <p className="text-sm text-white/80">{b.subtitle}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
