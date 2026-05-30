'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { useCart } from '@/components/providers/cart-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

interface WishItem {
  id: string;
  wishlist_id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  flash_price: number | null;
  is_flash_sale: boolean;
  images: string[];
  rating_avg: number;
  stock: number;
}

export default function WishlistPage() {
  const { toast } = useToast();
  const { reload } = useCart();
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get<{ data: WishItem[] }>('/wishlist').then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (productId: string) => {
    await api.delete(`/wishlist/${productId}`);
    setItems((it) => it.filter((x) => x.id !== productId));
  };

  const moveToCart = async (productId: string) => {
    try {
      await api.post('/wishlist/move-to-cart', { productId });
      setItems((it) => it.filter((x) => x.id !== productId));
      await reload();
      toast('Moved to cart', 'success');
    } catch {
      toast('Could not move to cart', 'error');
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading wishlist…</p>;

  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center py-16 text-center">
        <Heart className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-3 font-medium text-accent">Your wishlist is empty</p>
        <Button asChild className="mt-4"><Link href="/products">Browse products</Link></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-accent">My Wishlist</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => {
          const price = it.is_flash_sale && it.flash_price ? it.flash_price : it.price;
          return (
            <Card key={it.id} className="flex gap-3 p-3">
              <Link href={`/product/${it.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image src={it.images?.[0] || '/placeholder.png'} alt={it.name} fill className="object-cover" sizes="96px" />
              </Link>
              <div className="flex flex-1 flex-col">
                <Link href={`/product/${it.slug}`} className="font-medium text-accent line-clamp-2 hover:text-primary">{it.name}</Link>
                <span className="mt-1 font-bold text-accent">{formatPrice(price)}</span>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button size="sm" className="flex-1" disabled={it.stock < 1} onClick={() => moveToCart(it.id)}>
                    <ShoppingCart className="h-4 w-4" /> {it.stock < 1 ? 'Out of stock' : 'Move to cart'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(it.id)} aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
