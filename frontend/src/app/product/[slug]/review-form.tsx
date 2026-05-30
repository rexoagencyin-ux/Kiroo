'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="rounded-lg border bg-white p-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>{' '}
        to write a review.
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      toast('Please select a rating', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ verified: boolean }>('/reviews', { productId, rating, title, comment });
      toast(res.verified ? 'Verified review posted!' : 'Review submitted', 'success');
      setRating(0);
      setTitle('');
      setComment('');
      onSubmitted();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not submit review', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-white p-4">
      <h3 className="font-semibold text-accent">Write a review</h3>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i + 1)}
            aria-label={`Rate ${i + 1}`}
          >
            <Star className={cn('h-6 w-6', (hover || rating) > i ? 'fill-amber-400 text-amber-400' : 'text-muted')} />
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="rv-title">Title</Label>
        <Input id="rv-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Great value!" />
      </div>
      <div>
        <Label htmlFor="rv-comment">Your review</Label>
        <Textarea id="rv-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience…" />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        Submit review
      </Button>
    </form>
  );
}
