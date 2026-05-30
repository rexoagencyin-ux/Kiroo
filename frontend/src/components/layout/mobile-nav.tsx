'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, User2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/providers/cart-provider';

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Shop', icon: LayoutGrid },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/profile/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/profile', label: 'Account', icon: User2 },
];

export function MobileNav() {
  const pathname = usePathname();
  const { count } = useCart();

  if (pathname?.startsWith('/admin')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-white lg:hidden">
      {items.map((it) => {
        const active = pathname === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn('relative flex flex-col items-center gap-0.5 py-2 text-[11px]', active ? 'text-primary' : 'text-muted-foreground')}
          >
            <Icon className="h-5 w-5" />
            {it.href === '/cart' && count > 0 && (
              <span className="absolute right-5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                {count}
              </span>
            )}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
