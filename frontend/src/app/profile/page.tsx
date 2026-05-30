'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Heart, MapPin, Truck, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Order } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils';

export default function ProfileDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);

  useEffect(() => {
    api.get<{ data: Order[] }>('/orders').then((r) => setOrders(r.data)).catch(() => {});
    api.get<{ data: unknown[] }>('/wishlist').then((r) => setWishlistCount(r.data.length)).catch(() => {});
    api.get<{ data: unknown[] }>('/addresses').then((r) => setAddressCount(r.data.length)).catch(() => {});
  }, []);

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled', 'returned'].includes(o.status)).length;

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: Package, href: '/profile/orders' },
    { label: 'Active Orders', value: activeOrders, icon: Truck, href: '/profile/orders' },
    { label: 'Wishlist Items', value: wishlistCount, icon: Heart, href: '/profile/wishlist' },
    { label: 'Saved Addresses', value: addressCount, icon: MapPin, href: '/profile/addresses' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-accent">Hello, {user?.name.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground">Here&apos;s a quick overview of your account.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="p-4 transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-primary-50 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-2xl font-bold text-accent">{s.value}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-accent">Recent Orders</h2>
          <Link href="/profile/orders" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <Link key={o.id} href={`/track/${o.order_number}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted">
                <div>
                  <p className="font-medium text-accent">#{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.created_at)} · {o.items?.length ?? 0} items</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-accent">{formatPrice(o.total)}</p>
                  <Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">
                    {o.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
