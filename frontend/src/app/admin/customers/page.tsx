'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Eye, Ban, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Pagination } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrice, formatDate } from '@/lib/utils';

interface Customer {
  id: string; name: string; email: string; phone: string | null; created_at: string;
  is_active: boolean; order_count: number; total_spent: string;
}
interface CustomerDetail {
  customer: Customer & { avatar_url: string | null; last_login_at: string | null };
  orders: { id: string; order_number: string; total: string; status: string; created_at: string }[];
}

export default function AdminCustomers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) sp.set('q', q);
    api.get<{ data: Customer[]; pagination: Pagination }>(`/admin/customers?${sp.toString()}`)
      .then((r) => { setCustomers(r.data); setPagination(r.pagination); })
      .catch(() => {});
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  const view = async (id: string) => {
    const r = await api.get<{ data: CustomerDetail }>(`/admin/customers/${id}`);
    setDetail(r.data);
  };

  const toggle = async (id: string) => {
    await api.post(`/admin/customers/${id}/toggle`);
    toast('Customer status updated', 'success');
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-accent">Customers</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search name or email…" className="pl-9" />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Name</th><th>Email</th><th>Orders</th><th>Spent</th><th>Joined</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3 font-medium text-accent">{c.name}</td>
                <td>{c.email}</td>
                <td>{c.order_count}</td>
                <td>{formatPrice(c.total_spent)}</td>
                <td className="text-muted-foreground">{formatDate(c.created_at)}</td>
                <td><Badge variant={c.is_active ? 'success' : 'destructive'}>{c.is_active ? 'Active' : 'Blocked'}</Badge></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => view(c.id)} className="text-primary" aria-label="View"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => toggle(c.id)} className={c.is_active ? 'text-destructive' : 'text-primary'} aria-label="Toggle">
                      {c.is_active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="px-3 py-1.5 text-sm">Page {page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.customer.name}</DialogTitle></DialogHeader>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Email:</span> {detail.customer.email}</p>
                <p><span className="text-muted-foreground">Phone:</span> {detail.customer.phone ?? '—'}</p>
                <p><span className="text-muted-foreground">Joined:</span> {formatDate(detail.customer.created_at)}</p>
                <h3 className="mt-3 font-semibold text-accent">Order history ({detail.orders.length})</h3>
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {detail.orders.map((o) => (
                    <div key={o.id} className="flex justify-between rounded-md border p-2">
                      <span>{o.order_number}</span>
                      <span className="capitalize text-muted-foreground">{o.status}</span>
                      <span className="font-medium">{formatPrice(o.total)}</span>
                    </div>
                  ))}
                  {detail.orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
