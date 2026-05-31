'use client';

import Link from 'next/link';
import { IndianRupee, ShoppingCart, Package, AlertTriangle, Boxes } from 'lucide-react';
import { useAllOrders, useProducts } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils';

export default function AdminDashboard() {
  const { orders } = useAllOrders();
  const { products } = useProducts(false);

  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const revenue = validOrders.reduce((s, o) => s + o.total, 0);
  const today = new Date().toDateString();
  const revenueToday = validOrders
    .filter((o) => new Date(o.created_at).toDateString() === today)
    .reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;
  const lowStock = products.filter((p) => p.stock <= (p.low_stock_threshold ?? 5) && p.is_active);

  const cards = [
    { label: 'Total Revenue', value: formatPrice(revenue), sub: `${formatPrice(revenueToday)} today`, icon: IndianRupee, color: 'bg-primary-50 text-primary' },
    { label: 'Orders', value: orders.length, sub: `${pending} pending`, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Products', value: products.length, sub: `${products.filter((p) => p.is_active).length} active`, icon: Package, color: 'bg-amber-50 text-amber-600' },
    { label: 'Low Stock', value: lowStock.length, sub: 'need restock', icon: Boxes, color: 'bg-purple-50 text-purple-600' },
  ];

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-accent">Dashboard</h1>

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

      {lowStock.length > 0 && (
        <Link href="/admin/inventory">
          <Card className="flex items-center gap-3 border-amber-300 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800"><strong>{lowStock.length}</strong> product(s) are low on stock.</p>
          </Card>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-accent">Recent Orders</h2>
          {orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground"><tr className="border-b"><th className="py-2">Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {orders.slice(0, 8).map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-primary">{o.order_number}</td>
                      <td>{(o as { user_name?: string }).user_name ?? '—'}</td>
                      <td>{formatPrice(o.total)}</td>
                      <td><Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">{o.status}</Badge></td>
                      <td className="text-muted-foreground">{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-accent">Orders by Status</h2>
          <div className="space-y-2">
            {Object.keys(statusCounts).length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{status}</span>
                <span className="font-semibold text-accent">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
