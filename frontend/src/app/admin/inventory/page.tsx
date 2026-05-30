'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

interface InvItem {
  id: string; name: string; sku: string | null; stock: number; low_stock_threshold: number; price: string; is_low: boolean;
}

export default function AdminInventory() {
  const { toast } = useToast();
  const [items, setItems] = useState<InvItem[]>([]);
  const [lowOnly, setLowOnly] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api.get<{ data: InvItem[] }>(`/admin/inventory?low=${lowOnly}`).then((r) => setItems(r.data)).catch(() => {});
  }, [lowOnly]);

  useEffect(() => { load(); }, [load]);

  const save = async (id: string) => {
    const val = Number(edits[id]);
    if (Number.isNaN(val) || val < 0) return;
    await api.patch(`/admin/products/${id}/stock`, { stock: val });
    toast('Stock updated', 'success');
    setEdits((e) => { const c = { ...e }; delete c[id]; return c; });
    load();
  };

  const lowCount = items.filter((i) => i.is_low).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">Inventory</h1>
        <Button variant={lowOnly ? 'default' : 'outline'} size="sm" onClick={() => setLowOnly((v) => !v)}>
          <AlertTriangle className="h-4 w-4" /> {lowOnly ? 'Showing low stock' : `Low stock (${lowCount})`}
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Product</th><th>SKU</th><th>Price</th><th>Threshold</th><th>Stock</th><th>Update</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="p-3 font-medium text-accent">{it.name}</td>
                <td className="text-muted-foreground">{it.sku ?? '—'}</td>
                <td>{formatPrice(it.price)}</td>
                <td>{it.low_stock_threshold}</td>
                <td>
                  {it.is_low ? <Badge variant="destructive">{it.stock} low</Badge> : <span>{it.stock}</span>}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 w-20"
                      value={edits[it.id] ?? String(it.stock)}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [it.id]: e.target.value }))}
                    />
                    <Button size="sm" variant="outline" onClick={() => save(it.id)} aria-label="Save"><Save className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
