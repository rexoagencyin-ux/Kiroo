'use client';

import { useState } from 'react';
import { AlertTriangle, Save, Loader2 } from 'lucide-react';
import { useProducts, updateProduct } from '@/lib/store';
import { useToast } from '@/components/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

export default function AdminInventory() {
  const { toast } = useToast();
  const { products, loading } = useProducts(false);
  const [lowOnly, setLowOnly] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const list = products.filter((p) => (lowOnly ? p.stock <= (p.low_stock_threshold ?? 5) : true));
  const lowCount = products.filter((p) => p.stock <= (p.low_stock_threshold ?? 5)).length;

  const save = async (id: string) => {
    const val = Number(edits[id]);
    if (Number.isNaN(val) || val < 0) return;
    setSavingId(id);
    try {
      await updateProduct(id, { stock: val });
      toast('Stock updated', 'success');
      setEdits((e) => { const c = { ...e }; delete c[id]; return c; });
    } catch {
      toast('Update failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Inventory</h1>
        <Button variant={lowOnly ? 'default' : 'outline'} size="sm" onClick={() => setLowOnly((v) => !v)}>
          <AlertTriangle className="h-4 w-4" /> {lowOnly ? 'Showing low stock' : `Low stock (${lowCount})`}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr><th className="p-3">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Update</th></tr>
            </thead>
            <tbody>
              {list.map((it) => {
                const low = it.stock <= (it.low_stock_threshold ?? 5);
                return (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="p-3 font-medium text-accent">{it.name}</td>
                    <td className="text-muted-foreground">{it.category_name}</td>
                    <td>{formatPrice(it.price)}</td>
                    <td>{low ? <Badge variant="destructive">{it.stock} low</Badge> : <span>{it.stock}</span>}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Input type="number" className="h-8 w-20" value={edits[it.id] ?? String(it.stock)} onChange={(e) => setEdits((p) => ({ ...p, [it.id]: e.target.value }))} />
                        <Button size="sm" variant="outline" loading={savingId === it.id} onClick={() => save(it.id)} aria-label="Save"><Save className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
