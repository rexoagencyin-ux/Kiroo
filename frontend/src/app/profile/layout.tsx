'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, Package, Heart, MapPin, Settings, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const nav = [
  { href: '/profile', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile/orders', label: 'My Orders', icon: Package },
  { href: '/profile/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/profile/addresses', label: 'Addresses', icon: MapPin },
  { href: '/profile/settings', label: 'Settings', icon: Settings },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=/profile');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="container flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold text-accent">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <nav className="mt-4 flex flex-col gap-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm', active ? 'bg-primary-50 font-medium text-primary-700' : 'text-muted-foreground hover:bg-muted')}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
              <button
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </nav>
          </div>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
