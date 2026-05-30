'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Eye, Truck, FileText } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Order, Pagination } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice, formatDateTime } from '@/lib/utils';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

interface AdminOrder extends Order {
  customer_name?: string;
  customer_email?: string;
}

export default function AdminOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) sp.set('q', q);
    if (statusFilter !== 'all') sp.set('status', statusFilter);
    api.get<{ data: AdminOrder[]; pagination: Pagination }>(`/admin/orders?${sp.toString()}`)
      .then((r) => { setOrders(r.data); setPagination(r.pagination); })
      .catch(() => {});
  }, [q, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const openOrder = async (id: string) => {
    const r = await api.get<{ data: AdminOrder }>(`/admin/orders/${id}`);
    setSelected(r.data);
    setNewStatus(r.data.status);
    setTracking(r.data.tracking_number ?? '');
    setCourier(r.data.courier ?? '');
  };

  const updateStatus = async () => {
    if (!selected) return;
    try {
      await api.patch(`/admin/orders/${selected.id}/status`, { status: newStatus, trackingNumber: tracking || undefined, courier: courier || undefined });
      toast('Order updated', 'success');
      setSelected(null);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Update failed', 'error');
    }
  };

  const ship = async () => {
    if (!selected) return;
    try {
      await api.post(`/admin/orders/${selected.id}/ship`);
      toast('Shiprocket shipment created', 'success');
      openOrder(selected.id);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Shipping failed (check Shiprocket config)', 'error');
    }
  };

  const invoice = async () => {
    if (!selected) return;
    try {
      const res = await api.get<{ data: unknown }>(`/admin/orders/${selected.id}/invoice`);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<pre style="font-family:monospace;padding:20px">${JSON.stringify(res.data, null, 2)}</pre>`);
        w.document.title = `Invoice ${selected.order_number}`;
      }
    } catch {
      toast('Could not generate invoice', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-accent">Orders</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search order # or email…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="p-3 font-medium text-accent">{o.order_number}</td>
                <td>{o.customer_name ?? o.email}</td>
                <td>{formatPrice(o.total)}</td>
                <td><Badge variant={o.payment_status === 'paid' ? 'success' : 'secondary'} className="capitalize">{o.payment_method} · {o.payment_status}</Badge></td>
                <td><Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">{o.status}</Badge></td>
                <td className="text-muted-foreground">{formatDateTime(o.created_at)}</td>
                <td><button onClick={() => openOrder(o.id)} className="text-primary" aria-label="View"><Eye className="h-4 w-4" /></button></td>
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader><DialogTitle>Order {selected.order_number}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-md bg-muted/60 p-3">
                  <p className="font-medium text-accent">{selected.shipping_address?.full_name} · {selected.shipping_address?.phone}</p>
                  <p className="text-muted-foreground">{selected.shipping_address?.line1}, {selected.shipping_address?.city}, {selected.shipping_address?.state} {selected.shipping_address?.postal_code}</p>
                </div>
                <div className="space-y-1">
                  {selected.items?.map((it, i) => (
                    <div key={i} className="flex justify-between"><span>{it.name} × {it.quantity}</span><span>{formatPrice(it.total)}</span></div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-accent"><span>Total</span><span>{formatPrice(selected.total)}</span></div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Status</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Courier</label><Input value={courier} onChange={(e) => setCourier(e.target.value)} /></div>
                  <div className="col-span-2"><label className="text-xs text-muted-foreground">Tracking / AWB</label><Input value={tracking} onChange={(e) => setTracking(e.target.value)} /></div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={updateStatus} className="flex-1">Update status</Button>
                  <Button variant="outline" onClick={ship}><Truck className="h-4 w-4" /> Ship</Button>
                  <Button variant="outline" onClick={invoice}><FileText className="h-4 w-4" /> Invoice</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
