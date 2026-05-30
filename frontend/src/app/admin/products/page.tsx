'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Category, Pagination, Product } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploader } from '@/components/admin/image-uploader';
import { formatPrice } from '@/lib/utils';

interface FormState {
  name: string; brand: string; category_id: string; description: string; short_desc: string;
  price: string; compare_price: string; sku: string; stock: string; images: string[];
  specsText: string; tags: string;
  is_featured: boolean; is_trending: boolean; is_new_arrival: boolean; is_flash_sale: boolean; flash_price: string; is_active: boolean;
}

const emptyForm: FormState = {
  name: '', brand: '', category_id: '', description: '', short_desc: '', price: '', compare_price: '',
  sku: '', stock: '0', images: [], specsText: '', tags: '',
  is_featured: false, is_trending: false, is_new_arrival: false, is_flash_sale: false, flash_price: '', is_active: true,
};

export default function AdminProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get<{ data: Product[]; pagination: Pagination }>(`/admin/products?q=${encodeURIComponent(q)}&page=${page}&limit=20`)
      .then((r) => { setProducts(r.data); setPagination(r.pagination); })
      .catch(() => {});
  }, [q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get<{ data: Category[] }>('/categories', false).then((r) => setCategories(r.data)).catch(() => {}); }, []);

  const openNew = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, brand: p.brand ?? '', category_id: p.category_id ?? '', description: p.description ?? '',
      short_desc: p.short_desc ?? '', price: String(p.price), compare_price: p.compare_price ? String(p.compare_price) : '',
      sku: p.sku ?? '', stock: String(p.stock), images: p.images ?? [],
      specsText: Object.entries(p.specifications ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
      tags: (p.tags ?? []).join(', '),
      is_featured: p.is_featured, is_trending: p.is_trending, is_new_arrival: p.is_new_arrival,
      is_flash_sale: p.is_flash_sale, flash_price: p.flash_price ? String(p.flash_price) : '', is_active: p.is_active ?? true,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const specifications: Record<string, string> = {};
    form.specsText.split('\n').forEach((line) => {
      const [k, ...rest] = line.split(':');
      if (k && rest.length) specifications[k.trim()] = rest.join(':').trim();
    });
    const payload = {
      name: form.name, brand: form.brand || null, category_id: form.category_id || null,
      description: form.description, short_desc: form.short_desc,
      price: Number(form.price), compare_price: form.compare_price ? Number(form.compare_price) : null,
      sku: form.sku || null, stock: Number(form.stock), images: form.images, specifications,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      is_featured: form.is_featured, is_trending: form.is_trending, is_new_arrival: form.is_new_arrival,
      is_flash_sale: form.is_flash_sale, flash_price: form.flash_price ? Number(form.flash_price) : null, is_active: form.is_active,
    };
    try {
      if (editId) await api.patch(`/admin/products/${editId}`, payload);
      else await api.post('/admin/products', payload);
      toast(editId ? 'Product updated' : 'Product created', 'success');
      setOpen(false);
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast('Product deleted', 'success');
      load();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const toggle = (k: keyof FormState) => setForm((f) => ({ ...f, [k]: !f[k] }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-accent">Products</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Add product</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search products…" className="pl-9" />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Flags</th><th></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                      <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} fill className="object-cover" sizes="40px" />
                    </div>
                    <div className="min-w-0"><p className="truncate font-medium text-accent">{p.name}</p><p className="text-xs text-muted-foreground">{p.sku}</p></div>
                  </div>
                </td>
                <td>{(p as Product & { category_name?: string }).category_name ?? '—'}</td>
                <td>{formatPrice(p.price)}</td>
                <td><span className={p.stock <= (p.low_stock_threshold ?? 5) ? 'text-destructive font-medium' : ''}>{p.stock}</span></td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {p.is_featured && <Badge variant="secondary">Feat</Badge>}
                    {p.is_flash_sale && <Badge variant="destructive">Flash</Badge>}
                    {!p.is_active && <Badge variant="outline">Hidden</Badge>}
                  </div>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-primary" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? 'Edit product' : 'Add product'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><Label>Compare price (₹)</Label><Input type="number" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Short description</Label><Input value={form.short_desc} onChange={(e) => setForm({ ...form, short_desc: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Images</Label><ImageUploader value={form.images} onChange={(urls) => setForm({ ...form, images: urls })} /><Input className="mt-2" placeholder="https://… , https://…" value={form.images.join(', ')} onChange={(e) => setForm({ ...form, images: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></div>
            <div className="sm:col-span-2"><Label>Specifications (one per line: Key: Value)</Label><Textarea value={form.specsText} onChange={(e) => setForm({ ...form, specsText: e.target.value })} placeholder={'Brand: Modern\nWarranty: 1 Year'} /></div>
            <div className="sm:col-span-2"><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>

            <div className="sm:col-span-2 flex flex-wrap gap-4 rounded-md border p-3 text-sm">
              {(['is_featured', 'is_trending', 'is_new_arrival', 'is_flash_sale', 'is_active'] as const).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={form[k]} onChange={() => toggle(k)} className="h-4 w-4 accent-[#4CAF50]" />
                  {k.replace('is_', '').replace('_', ' ')}
                </label>
              ))}
            </div>
            {form.is_flash_sale && (
              <div className="sm:col-span-2"><Label>Flash price (₹)</Label><Input type="number" value={form.flash_price} onChange={(e) => setForm({ ...form, flash_price: e.target.value })} /></div>
            )}
          </div>
          <Button onClick={save} loading={saving} className="mt-2 w-full">{editId ? 'Update' : 'Create'} product</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
