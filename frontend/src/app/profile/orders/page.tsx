'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Package, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useUserOrders, updateOrderStatus } from '@/lib/store';
import { useToast } from '@/components/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice } from '@/lib/utils';

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { orders, loading } = useUserOrders(user?.id ?? null);

  const cancel = async (id: string) => {
    try {
      await updateOrderStatus(id, { status: 'cancelled' });
      toast('Order cancelled', 'success');
    } catch {
      toast('Could not cancel order', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (orders.length === 0) {
    return (
      <Card className="flex flex-col items-center py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-3 font-medium text-accent">No orders yet</p>
        <Button asChild className="mt-4"><Link href="/products">Start shopping</Link></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-accent">My Orders</h1>
      {orders.map((o) => (
        <Card key={o.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <p className="font-medium text-accent">#{o.order_number}</p>
              <p className="text-xs text-muted-foreground">Placed {formatDate(o.created_at)}</p>
            </div>
            <Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize">{o.status}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {(o.items ?? []).slice(0, 3).map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  <Image src={(it as { image?: string }).image || it.image_url || '/placeholder.png'} alt={it.name} fill className="object-cover" sizes="40px" />
                </div>
                <span className="flex-1 truncate text-sm">{it.name} × {it.quantity}</span>
                <span className="text-sm">{formatPrice(it.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="font-semibold text-accent">{formatPrice(o.total)}</span>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline"><Link href={`/track/${o.order_number}`}>Track</Link></Button>
              {!['delivered', 'cancelled', 'shipped'].includes(o.status) && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancel(o.id)}>Cancel</Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
