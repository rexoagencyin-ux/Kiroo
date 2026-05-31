'use client';

import { useMemo, useState } from 'react';
import { Search, Eye, Loader2 } from 'lucide-react';
import { useAllOrders, updateOrderStatus } from '@/lib/store';
import { useToast } from '@/components/providers/toast-provider';
import { Order } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice, formatDateTime } from '@/lib/utils';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const { toast } = useToast();
  const { orders, loading } = useAllOrders();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (q) {
        const t = q.toLowerCase();
        const email = (o as { user_email?: string }).user_email ?? '';
        return o.order_number.toLowerCase().includes(t) || email.toLowerCase().includes(t);
      }
      return true;
    });
  }, [orders, q, statusFilter]);

  const openOrder = (o: Order) => {
    setSelected(o);
    setNewStatus(o.status);
    setTracking(o.tracking_number ?? '');
    setCourier(o.courier ?? '');
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateOrderStatus(selected.id, { status: newStatus, tracking_number: tracking || undefined, courier: courier || undefined });
      toast('Order updated', 'success');
      setSelected(null);
    } catch {
      toast('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-accent">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} orders · live</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order # or email…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">No orders found.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr><th className="p-3">Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-accent">{o.order_number}</td>
                  <td>{(o as { user_name?: string }).user_name ?? (o as { user_email?: string }).user_email ?? '—'}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td><Badge variant={o.payment_status === 'paid' ? 'success' : 'secondary'} className="capitalize">{o.payment_method} · {o.payment_status}</Badge></td>
                  <td><Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">{o.status}</Badge></td>
                  <td className="text-muted-foreground">{formatDateTime(o.created_at)}</td>
                  <td><button onClick={() => openOrder(o)} className="text-primary" aria-label="View"><Eye className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
                  <div className="col-span-2"><label className="text-xs text-muted-foreground">Tracking number</label><Input value={tracking} onChange={(e) => setTracking(e.target.value)} /></div>
                </div>
                <Button onClick={save} loading={saving} className="w-full">Update Order</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
