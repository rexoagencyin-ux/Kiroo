'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Ticket } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Coupon } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice, formatDate } from '@/lib/utils';

const empty = {
  code: '', description: '', type: 'percentage', value: '', min_order: '0', max_discount: '',
  usage_limit: '', per_user_limit: '1', expires_at: '', is_active: true,
};

export default function AdminCoupons() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = () => api.get<{ data: Coupon[] }>('/admin/coupons').then((r) => setCoupons(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      code: c.code, description: c.description ?? '', type: c.type, value: String(c.value),
      min_order: String(c.min_order), max_discount: c.max_discount ? String(c.max_discount) : '',
      usage_limit: c.usage_limit ? String(c.usage_limit) : '', per_user_limit: String(c.per_user_limit),
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '', is_active: c.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      code: form.code, description: form.description, type: form.type, value: Number(form.value),
      min_order: Number(form.min_order), max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null, per_user_limit: Number(form.per_user_limit),
      expires_at: form.expires_at || null, is_active: form.is_active,
    };
    try {
      if (editId) await api.patch(`/admin/coupons/${editId}`, payload);
      else await api.post('/admin/coupons', payload);
      toast('Coupon saved', 'success');
      setOpen(false);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Save failed', 'error');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete coupon?')) return;
    try { await api.delete(`/admin/coupons/${id}`); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Coupons</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Add coupon</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                <span className="font-mono font-bold text-accent">{c.code}</span>
              </div>
              <Badge variant={c.is_active ? 'success' : 'outline'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-1 text-sm font-medium text-accent">
              {c.type === 'percentage' ? `${c.value}% off` : `${formatPrice(c.value)} off`}
              {c.min_order > 0 && ` · min ${formatPrice(c.min_order)}`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Used {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}
              {c.expires_at && ` · expires ${formatDate(c.expires_at)}`}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit coupon' : 'Add coupon'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} disabled={!!editId} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed amount</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Value {form.type === 'percentage' ? '(%)' : '(₹)'}</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
            <div><Label>Min order (₹)</Label><Input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} /></div>
            <div><Label>Max discount (₹)</Label><Input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} /></div>
            <div><Label>Usage limit</Label><Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} /></div>
            <div><Label>Per user limit</Label><Input type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} /></div>
            <div><Label>Expires at</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.is_active} onChange={() => setForm({ ...form, is_active: !form.is_active })} className="h-4 w-4 accent-[#4CAF50]" /> Active</label>
          </div>
          <Button onClick={save} className="mt-2 w-full">Save coupon</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
