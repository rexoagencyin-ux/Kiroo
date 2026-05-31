'use client';

import Link from 'next/link';
import { Package, Truck, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useUserOrders } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils';

export default function ProfileDashboard() {
  const { user } = useAuth();
  const { orders, loading } = useUserOrders(user?.id ?? null);

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
  const totalSpent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: Package },
    { label: 'Active Orders', value: active, icon: Truck },
    { label: 'Total Spent', value: formatPrice(totalSpent), icon: ShoppingBag },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-accent">Hello, {user?.name.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground">Here&apos;s an overview of your account.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="inline-flex rounded-lg bg-primary-50 p-2"><Icon className="h-5 w-5 text-primary" /></div>
              <p className="mt-3 text-xl font-bold text-accent">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-accent">Recent Orders</h2>
          <Link href="/profile/orders" className="flex items-center gap-1 text-sm text-primary hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
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
                  <Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">{o.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
