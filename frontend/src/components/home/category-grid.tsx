import Image from 'next/image';
import Link from 'next/link';
import { Category } from '@/lib/types';

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
      {categories.map((c) => (
        <Link key={c.id} href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-full border bg-muted">
            {c.image_url && (
              <Image src={c.image_url} alt={c.name} fill className="object-cover transition group-hover:scale-110" sizes="80px" />
            )}
          </div>
          <span className="text-center text-xs font-medium text-accent">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
