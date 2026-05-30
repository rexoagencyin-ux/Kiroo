'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';
import { Product } from '@/lib/types';
import { cn, discountPercent, formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { api } from '@/lib/api';

export function ProductCard({ product, view = 'grid' }: { product: Product; view?: 'grid' | 'list' }) {
  const { add } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [wished, setWished] = useState(false);

  const price = product.is_flash_sale && product.flash_price ? product.flash_price : product.price;
  const discount = discountPercent(price, product.compare_price);

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await add(product, 1);
      toast(`${product.name} added to cart`, 'success');
    } catch {
      toast('Could not add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleWish = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast('Please log in to use your wishlist', 'info');
      return;
    }
    try {
      await api.post('/wishlist', { productId: product.id });
      setWished(true);
      toast('Added to wishlist', 'success');
    } catch {
      toast('Could not update wishlist', 'error');
    }
  };

  if (view === 'list') {
    return (
      <Link
        href={`/product/${product.slug}`}
        className="group flex gap-4 rounded-lg border bg-white p-3 transition hover:shadow-md"
      >
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
          <Image src={product.images?.[0] || '/placeholder.png'} alt={product.name} fill className="object-cover" sizes="128px" />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-accent line-clamp-2">{product.name}</h3>
            {discount > 0 && <Badge variant="destructive">-{discount}%</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.short_desc || product.description}</p>
          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-accent">{formatPrice(price)}</span>
              {product.compare_price && product.compare_price > price && (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.compare_price)}</span>
              )}
            </div>
            <Button size="sm" onClick={handleAdd} loading={adding} disabled={product.stock < 1}>
              <ShoppingCart className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={product.images?.[0] || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.is_flash_sale && <Badge variant="destructive">Flash</Badge>}
          {discount > 0 && <Badge variant="accent">-{discount}%</Badge>}
          {product.is_new_arrival && <Badge variant="success">New</Badge>}
        </div>
        <button
          onClick={handleWish}
          aria-label="Add to wishlist"
          className="absolute right-2 top-2 rounded-full bg-white/90 p-2 opacity-0 shadow-sm transition group-hover:opacity-100"
        >
          <Heart className={cn('h-4 w-4', wished ? 'fill-destructive text-destructive' : 'text-accent')} />
        </button>
        {product.stock < 1 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded bg-accent px-3 py-1 text-xs font-semibold text-white">Out of stock</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {product.brand && <span className="text-xs text-muted-foreground">{product.brand}</span>}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-accent">{product.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{Number(product.rating_avg).toFixed(1)}</span>
          <span>({product.rating_count})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-accent">{formatPrice(price)}</span>
          {product.compare_price && product.compare_price > price && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.compare_price)}</span>
          )}
        </div>
        <Button size="sm" className="mt-3 w-full" onClick={handleAdd} loading={adding} disabled={product.stock < 1}>
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </Button>
      </div>
    </Link>
  );
}
