'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/utils';

interface Analytics {
  salesByDay: { day: string; revenue: number; orders: number }[];
  topProducts: { id: string; name: string; units: number; revenue: string }[];
  categorySales: { name: string; revenue: number }[];
}

const COLORS = ['#4CAF50', '#1E1E1E', '#66BB6A', '#9CCC65', '#43A047', '#A5D6A7', '#2E7D32', '#C8E6C9'];

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState('30');

  useEffect(() => {
    api.get<{ data: Analytics }>(`/admin/analytics?days=${days}`).then((r) => setData(r.data)).catch(() => {});
  }, [days]);

  if (!data) return <p className="text-muted-foreground">Loading analytics…</p>;

  const totalRevenue = data.salesByDay.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.salesByDay.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Analytics</h1>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Revenue ({days}d)</p><p className="text-2xl font-bold text-accent">{formatPrice(totalRevenue)}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Orders ({days}d)</p><p className="text-2xl font-bold text-accent">{totalOrders}</p></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue over time</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesByDay}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#4CAF50" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top products</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topProducts.map((p) => ({ name: p.name.slice(0, 14), revenue: Number(p.revenue) }))} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Bar dataKey="revenue" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.categorySales.filter((c) => c.revenue > 0)} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                    {data.categorySales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
