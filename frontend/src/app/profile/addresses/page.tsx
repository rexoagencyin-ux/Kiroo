'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Star, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Address } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const empty = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India' };

export default function AddressesPage() {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = () => api.get<{ data: Address[] }>('/addresses').then((r) => setAddresses(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (a: Address) => {
    setEditId(a.id);
    setForm({ full_name: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, postal_code: a.postal_code, country: a.country });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editId) await api.patch(`/addresses/${editId}`, form);
      else await api.post('/addresses', form);
      toast('Address saved', 'success');
      setOpen(false);
      load();
    } catch {
      toast('Could not save address', 'error');
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/addresses/${id}`);
    load();
  };
  const setDefault = async (id: string) => {
    await api.post(`/addresses/${id}/default`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Saved Addresses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4" /> Add address</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit address' : 'Add new address'}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Pincode</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Address line 1</Label><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Address line 2</Label><Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            </div>
            <Button onClick={save} className="mt-2 w-full">Save address</Button>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 font-medium text-accent">No saved addresses</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-accent">{a.full_name}</p>
                  {a.is_default && <Badge variant="success">Default</Badge>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="text-muted-foreground hover:text-accent" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.phone}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postal_code}</p>
              {!a.is_default && (
                <Button size="sm" variant="ghost" className="mt-2 text-primary" onClick={() => setDefault(a.id)}>
                  <Star className="h-4 w-4" /> Set as default
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
