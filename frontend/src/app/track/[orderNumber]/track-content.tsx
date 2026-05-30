'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Package, CheckCircle2, Truck, Home, Clock, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatPrice, formatDateTime } from '@/lib/utils';

interface TimelineStep {
  status: string;
  done: boolean;
  current: boolean;
}
interface TrackData {
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: string;
  tracking_number: string | null;
  courier: string | null;
  placed_at: string;
  delivered_at: string | null;
  items: { name: string; image_url: string | null; quantity: number; total: number }[];
  timeline: TimelineStep[];
}

const ICONS: Record<string, typeof Package> = {
  pending: Clock,
  confirmed: CheckCircle2,
  processing: Package,
  shipped: Truck,
  delivered: Home,
  cancelled: XCircle,
};

export function TrackContent({ orderNumber }: { orderNumber: string }) {
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get<{ data: TrackData }>(`/orders/track/${orderNumber}`, false)
      .then((r) => setData(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="container flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-bold text-accent">Order not found</h1>
        <p className="mt-1 text-muted-foreground">Please check the order number and try again.</p>
        <Button asChild className="mt-6">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    );
  }

  const cancelled = data.status === 'cancelled';

  return (
    <div className="container max-w-3xl py-8">
      <div className="rounded-xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-accent">Order #{data.order_number}</h1>
            <p className="text-sm text-muted-foreground">Placed on {formatDateTime(data.placed_at)}</p>
          </div>
          <Badge variant={cancelled ? 'destructive' : 'success'} className="capitalize">
            {data.status}
          </Badge>
        </div>

        {/* Timeline */}
        <div className="mt-8">
          {cancelled ? (
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
              <XCircle className="h-6 w-6" /> This order was cancelled.
            </div>
          ) : (
            <div className="relative flex justify-between">
              <div className="absolute left-0 right-0 top-5 h-0.5 bg-muted" />
              {data.timeline.map((step) => {
                const Icon = ICONS[step.status] ?? Clock;
                return (
                  <div key={step.status} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white',
                        step.done ? 'border-primary bg-primary text-white' : 'border-muted text-muted-foreground',
                        step.current && 'ring-4 ring-primary/20'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn('text-center text-[11px] capitalize', step.done ? 'font-semibold text-accent' : 'text-muted-foreground')}>
                      {step.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {(data.tracking_number || data.courier) && (
          <div className="mt-6 rounded-lg bg-muted/60 p-4 text-sm">
            {data.courier && <p><span className="text-muted-foreground">Courier:</span> <strong>{data.courier}</strong></p>}
            {data.tracking_number && <p><span className="text-muted-foreground">Tracking / AWB:</span> <strong>{data.tracking_number}</strong></p>}
          </div>
        )}

        {/* Items */}
        <div className="mt-6">
          <h2 className="mb-2 font-semibold text-accent">Items</h2>
          <div className="space-y-2">
            {data.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border p-2">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                  <Image src={it.image_url || '/placeholder.png'} alt={it.name} fill className="object-cover" sizes="48px" />
                </div>
                <span className="flex-1 text-sm">{it.name} × {it.quantity}</span>
                <span className="text-sm font-medium">{formatPrice(it.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t pt-3 font-semibold text-accent">
            <span>Total ({data.payment_method.toUpperCase()} · {data.payment_status})</span>
            <span>{formatPrice(data.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
