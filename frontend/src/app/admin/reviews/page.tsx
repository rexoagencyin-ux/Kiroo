'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatDate } from '@/lib/utils';

interface AdminReview {
  id: string; rating: number; title: string | null; comment: string | null;
  is_verified: boolean; status: string; created_at: string;
  user_name: string; product_name: string; product_slug: string;
}

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [status, setStatus] = useState('pending');

  const load = useCallback(() => {
    api.get<{ data: AdminReview[] }>(`/admin/reviews?status=${status}`).then((r) => setReviews(r.data)).catch(() => {});
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const moderate = async (id: string, s: 'approved' | 'rejected') => {
    await api.post(`/admin/reviews/${id}/moderate`, { status: s });
    toast(`Review ${s}`, 'success');
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-accent">Reviews</h1>

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {reviews.length === 0 && <p className="text-muted-foreground">No {status} reviews.</p>}
        {reviews.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-accent">{r.user_name}</span>
                  {r.is_verified && <Badge variant="success">Verified</Badge>}
                  <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">on {r.product_name} · {formatDate(r.created_at)}</p>
                <div className="mt-1 flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-4 w-4', i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted')} />
                  ))}
                </div>
                {r.title && <p className="mt-1 font-medium text-accent">{r.title}</p>}
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                {r.status !== 'approved' && (
                  <Button size="sm" variant="outline" className="text-primary" onClick={() => moderate(r.id, 'approved')}><Check className="h-4 w-4" /></Button>
                )}
                {r.status !== 'rejected' && (
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => moderate(r.id, 'rejected')}><X className="h-4 w-4" /></Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
