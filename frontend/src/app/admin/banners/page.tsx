'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Banner } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploader } from '@/components/admin/image-uploader';

const empty = { title: '', subtitle: '', image_url: '', link_url: '', cta_label: '', position: 'hero', sort_order: '0', is_active: true };

export default function AdminBanners() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = () => api.get<{ data: Banner[] }>('/admin/banners').then((r) => setBanners(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (b: Banner) => {
    setEditId(b.id);
    setForm({ title: b.title ?? '', subtitle: b.subtitle ?? '', image_url: b.image_url, link_url: b.link_url ?? '', cta_label: b.cta_label ?? '', position: b.position, sort_order: '0', is_active: true });
    setOpen(true);
  };

  const save = async () => {
    if (!form.image_url) return toast('Banner image is required', 'error');
    const payload = { ...form, sort_order: Number(form.sort_order) };
    try {
      if (editId) await api.patch(`/admin/banners/${editId}`, payload);
      else await api.post('/admin/banners', payload);
      toast('Banner saved', 'success');
      setOpen(false);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Save failed', 'error');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete banner?')) return;
    try { await api.delete(`/admin/banners/${id}`); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Banners</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Add banner</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {banners.map((b) => (
          <Card key={b.id} className="overflow-hidden">
            <div className="relative aspect-[3/1] bg-muted">
              <Image src={b.image_url} alt={b.title || 'Banner'} fill className="object-cover" sizes="(max-width:640px) 100vw, 50vw" />
              <Badge className="absolute left-2 top-2 capitalize">{b.position}</Badge>
            </div>
            <div className="flex items-center justify-between p-3">
              <div className="min-w-0"><p className="truncate font-medium text-accent">{b.title || 'Untitled'}</p><p className="truncate text-xs text-muted-foreground">{b.subtitle}</p></div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(b)} className="text-muted-foreground hover:text-primary" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(b.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit banner' : 'Add banner'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Image</Label><ImageUploader value={form.image_url ? [form.image_url] : []} onChange={(urls) => setForm({ ...form, image_url: urls[urls.length - 1] ?? '' })} /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CTA label</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></div>
              <div><Label>Link URL</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/products" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Position</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="hero">Hero</SelectItem><SelectItem value="promo">Promo</SelectItem><SelectItem value="sidebar">Sidebar</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
            </div>
          </div>
          <Button onClick={save} className="mt-2 w-full">Save banner</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
