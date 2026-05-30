'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Ticket, Image as ImageIcon,
  Star, Boxes, BarChart3, LogOut, Menu, X, Store, Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?redirect=/admin');
    else if (user.role !== 'admin') router.replace('/');
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const Sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2 px-5 py-4 text-lg font-bold text-white">
        <Store className="h-5 w-5 text-primary" /> Modern<span className="text-primary">Admin</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', active ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10')}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/" className="mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10">
          <Store className="h-4 w-4" /> View store
        </Link>
        <button
          onClick={async () => { await logout(); router.push('/'); }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 hidden w-60 bg-accent lg:block">{Sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 bg-accent">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 text-white" aria-label="Close"><X className="h-5 w-5" /></button>
            {Sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
          <span className="font-bold">Modern<span className="text-primary">Admin</span></span>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
