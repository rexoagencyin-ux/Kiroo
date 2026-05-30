'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IndianRupee, ShoppingCart, Users, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils';

interface Dashboard {
  revenue: { total: number; today: number; month: number };
  orders: { total: number; pending: number; today: number };
  users: { total: number; today: number };
  products: { total: number; active: number };
  lowStock: number;
  recentOrders: { id: string; order_number: string; total: string; status: string; payment_status: string; created_at: string; customer: string | null }[];
  statusBreakdown: { status: string; count: number }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.get<{ data: Dashboard }>('/admin/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading dashboard…</p>;

  const cards = [
    { label: 'Total Revenue', value: formatPrice(data.revenue.total), sub: `${formatPrice(data.revenue.today)} today`, icon: IndianRupee, color: 'bg-primary-50 text-primary' },
    { label: 'Orders', value: data.orders.total, sub: `${data.orders.pending} pending`, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Customers', value: data.users.total, sub: `${data.users.today} new today`, icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'Products', value: data.products.total, sub: `${data.products.active} active`, icon: Package, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Dashboard</h1>
        <Badge variant="success" className="gap-1"><TrendingUp className="h-3 w-3" /> {formatPrice(data.revenue.month)} this month</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4">
              <div className={`inline-flex rounded-lg p-2 ${c.color}`}><Icon className="h-5 w-5" /></div>
              <p className="mt-3 text-2xl font-bold text-accent">{c.value}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
            </Card>
          );
        })}
      </div>

      {data.lowStock > 0 && (
        <Link href="/admin/inventory">
          <Card className="flex items-center gap-3 border-amber-300 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>{data.lowStock}</strong> product(s) are low on stock. Click to manage inventory.
            </p>
          </Card>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-accent">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2">Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2"><Link href={`/admin/orders?q=${o.order_number}`} className="font-medium text-primary">{o.order_number}</Link></td>
                    <td>{o.customer ?? 'Guest'}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td><Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">{o.status}</Badge></td>
                    <td className="text-muted-foreground">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-accent">Orders by Status</h2>
          <div className="space-y-2">
            {data.statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{s.status}</span>
                <span className="font-semibold text-accent">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
