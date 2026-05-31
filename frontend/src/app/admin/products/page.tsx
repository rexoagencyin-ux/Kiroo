'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Search, Upload, X, Loader2, PackagePlus } from 'lucide-react';
import { useProducts, createProduct, updateProduct, deleteProduct, uploadImage, ProductInput } from '@/lib/store';
import { CATEGORIES } from '@/lib/categories';
import { useToast } from '@/components/providers/toast-provider';
import { Product } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/utils';

interface FormState {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: string;
  compare_price: string;
  stock: string;
  images: string[];
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  is_flash_sale: boolean;
  flash_price: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: '', brand: '', category: CATEGORIES[0].slug, description: '', price: '', compare_price: '',
  stock: '10', images: [], is_featured: false, is_trending: false, is_new_arrival: false,
  is_flash_sale: false, flash_price: '', is_active: true,
};

export default function AdminProducts() {
  const { toast } = useToast();
  const { products, loading } = useProducts(false); // include inactive in admin
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [products, q]
  );

  const openNew = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, brand: p.brand ?? '', category: p.category_slug || CATEGORIES[0].slug,
      description: p.description ?? '', price: String(p.price),
      compare_price: p.compare_price ? String(p.compare_price) : '', stock: String(p.stock),
      images: p.images ?? [], is_featured: p.is_featured, is_trending: p.is_trending,
      is_new_arrival: p.is_new_arrival, is_flash_sale: p.is_flash_sale,
      flash_price: p.flash_price ? String(p.flash_price) : '', is_active: p.is_active !== false,
    });
    setOpen(true);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadImage(f)));
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      toast('Image uploaded', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Image upload failed (enable Firebase Storage)', 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return toast('Product name is required', 'error');
    if (!form.price || Number(form.price) <= 0) return toast('Enter a valid price', 'error');
    setSaving(true);
    const payload: ProductInput = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      description: form.description,
      short_desc: form.description.slice(0, 120),
      price: Number(form.price),
      compare_price: form.compare_price ? Number(form.compare_price) : null,
      flash_price: form.is_flash_sale && form.flash_price ? Number(form.flash_price) : null,
      stock: Number(form.stock) || 0,
      images: form.images,
      is_featured: form.is_featured,
      is_trending: form.is_trending,
      is_new_arrival: form.is_new_arrival,
      is_flash_sale: form.is_flash_sale,
      is_active: form.is_active,
    };
    try {
      if (editId) await updateProduct(editId, payload);
      else await createProduct(payload);
      toast(editId ? 'Product updated ✓' : 'Product added ✓', 'success');
      setOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await deleteProduct(p.id);
      toast('Product deleted', 'success');
    } catch {
      toast('Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-accent">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} products · saved live to Firebase</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Add Product</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <PackagePlus className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-accent">No products yet</p>
          <p className="text-sm text-muted-foreground">Click “Add Product” to create your first one.</p>
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Add Product</Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="flex gap-3 p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} fill className="object-cover" sizes="80px" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate font-medium text-accent">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category_name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-semibold text-accent">{formatPrice(p.price)}</span>
                  <span className={`text-xs ${p.stock <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>Stock: {p.stock}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.is_featured && <Badge variant="secondary">Featured</Badge>}
                  {p.is_flash_sale && <Badge variant="destructive">Flash</Badge>}
                  {!p.is_active && <Badge variant="outline">Hidden</Badge>}
                </div>
                <div className="mt-auto flex gap-1 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Images */}
            <div>
              <Label>Product Images</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {form.images.map((url, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border">
                    <Image src={url} alt={`img ${i + 1}`} fill className="object-cover" sizes="80px" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white" aria-label="Remove">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:border-primary">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  Upload
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </label>
              </div>
            </div>

            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pulse Pro Smartwatch" /></div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Price (₹) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>MRP (₹)</Label><Input type="number" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} /></div>
              <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            </div>

            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the product…" /></div>

            <div className="flex flex-wrap gap-4 rounded-md border p-3 text-sm">
              {([['is_featured', 'Featured'], ['is_trending', 'Trending'], ['is_new_arrival', 'New'], ['is_flash_sale', 'Flash Sale'], ['is_active', 'Active']] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={form[k]} onChange={() => setForm((f) => ({ ...f, [k]: !f[k] }))} className="h-4 w-4 accent-[#4CAF50]" />
                  {label}
                </label>
              ))}
            </div>
            {form.is_flash_sale && (
              <div><Label>Flash Sale Price (₹)</Label><Input type="number" value={form.flash_price} onChange={(e) => setForm({ ...form, flash_price: e.target.value })} /></div>
            )}

            <Button onClick={save} loading={saving} className="w-full" size="lg">
              {editId ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
