'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Category } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageUploader } from '@/components/admin/image-uploader';

const empty = { name: '', description: '', image_url: '', sort_order: '0', is_active: true };

export default function AdminCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = () => api.get<{ data: Category[] }>('/categories', false).then((r) => setCategories(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Category) => {
    setEditId(c.id);
    setForm({ name: c.name, description: c.description ?? '', image_url: c.image_url ?? '', sort_order: String(c.sort_order ?? 0), is_active: c.is_active ?? true });
    setOpen(true);
  };

  const save = async () => {
    const payload = { name: form.name, description: form.description, image_url: form.image_url || null, sort_order: Number(form.sort_order), is_active: form.is_active };
    try {
      if (editId) await api.patch(`/admin/categories/${editId}`, payload);
      else await api.post('/admin/categories', payload);
      toast('Category saved', 'success');
      setOpen(false);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Save failed', 'error');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try { await api.delete(`/admin/categories/${id}`); toast('Deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Categories</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Add category</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.id} className="flex items-center gap-3 p-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
              {c.image_url && <Image src={c.image_url} alt={c.name} fill className="object-cover" sizes="56px" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-accent">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.product_count ?? 0} products</p>
              {c.is_active === false && <Badge variant="outline" className="mt-1">Hidden</Badge>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-primary" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit category' : 'Add category'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Image</Label><ImageUploader value={form.image_url ? [form.image_url] : []} onChange={(urls) => setForm({ ...form, image_url: urls[urls.length - 1] ?? '' })} /></div>
            <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={() => setForm({ ...form, is_active: !form.is_active })} className="h-4 w-4 accent-[#4CAF50]" /> Active</label>
          </div>
          <Button onClick={save} className="mt-2 w-full">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
