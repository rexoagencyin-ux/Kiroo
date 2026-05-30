'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, Minus, Plus, ShoppingCart, Star, Truck, ShieldCheck, RotateCcw, Check } from 'lucide-react';
import { Product, Review } from '@/lib/types';
import { cn, discountPercent, formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductCard } from '@/components/product/product-card';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { api } from '@/lib/api';
import { ReviewForm } from './review-form';

interface Props {
  product: Product;
  related: Product[];
  reviews: Review[];
}

export function ProductDetail({ product, related, reviews: initialReviews }: Props) {
  const router = useRouter();
  const { add } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string | null>(product.variants?.[0]?.options?.[0] ?? null);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [busy, setBusy] = useState(false);

  const images = product.images?.length ? product.images : ['/placeholder.png'];
  const price = product.is_flash_sale && product.flash_price ? product.flash_price : product.price;
  const discount = discountPercent(price, product.compare_price);
  const inStock = product.stock > 0;

  const handleAdd = async (buyNow = false) => {
    setBusy(true);
    try {
      await add(product, qty, variant);
      if (buyNow) router.push('/cart');
      else toast(`${product.name} added to cart`, 'success');
    } catch {
      toast('Could not add to cart', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleWish = async () => {
    if (!user) {
      toast('Please log in to use your wishlist', 'info');
      return;
    }
    try {
      await api.post('/wishlist', { productId: product.id });
      toast('Added to wishlist', 'success');
    } catch {
      toast('Could not update wishlist', 'error');
    }
  };

  const reloadReviews = async () => {
    const r = await api.get<{ data: Review[] }>(`/reviews/product/${product.id}`, false);
    setReviews(r.data);
  };

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="zoom-container relative aspect-square overflow-hidden rounded-xl border bg-white">
            <Image src={images[activeImage]} alt={product.name} fill className="object-contain" sizes="(max-width:1024px) 100vw, 50vw" priority />
            {discount > 0 && <Badge variant="destructive" className="absolute left-3 top-3">-{discount}%</Badge>}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn('relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2', i === activeImage ? 'border-primary' : 'border-transparent')}
              >
                <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Hover over the image to zoom</p>
        </div>

        {/* Info */}
        <div>
          {product.brand && <p className="text-sm font-medium text-primary">{product.brand}</p>}
          <h1 className="mt-1 text-2xl font-bold text-accent md:text-3xl">{product.name}</h1>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('h-4 w-4', i < Math.round(product.rating_avg) ? 'fill-amber-400 text-amber-400' : 'text-muted')} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {Number(product.rating_avg).toFixed(1)} · {product.rating_count} reviews
            </span>
            <span className="text-sm text-muted-foreground">· {product.sold_count} sold</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-accent">{formatPrice(price)}</span>
            {product.compare_price && product.compare_price > price && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compare_price)}</span>
                <Badge variant="success">Save {formatPrice(product.compare_price - price)}</Badge>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>

          {product.short_desc && <p className="mt-4 text-muted-foreground">{product.short_desc}</p>}

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="mt-4 space-y-3">
              {product.variants.map((v) => (
                <div key={v.name}>
                  <p className="mb-1 text-sm font-medium text-accent">{v.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {v.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setVariant(opt)}
                        className={cn('rounded-md border px-3 py-1.5 text-sm', variant === opt ? 'border-primary bg-primary-50 text-primary-700' : 'border-input')}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stock + qty */}
          <div className="mt-5 flex items-center gap-4">
            <div className="flex items-center rounded-md border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5" aria-label="Decrease">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="p-2.5" aria-label="Increase">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {inStock ? (
              <span className="text-sm font-medium text-primary">
                {product.stock <= (product.low_stock_threshold ?? 5) ? `Only ${product.stock} left!` : 'In stock'}
              </span>
            ) : (
              <span className="text-sm font-medium text-destructive">Out of stock</span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1" disabled={!inStock} loading={busy} onClick={() => handleAdd(false)}>
              <ShoppingCart className="h-5 w-5" /> Add to Cart
            </Button>
            <Button size="lg" variant="accent" className="flex-1" disabled={!inStock} onClick={() => handleAdd(true)}>
              Buy Now
            </Button>
            <Button size="lg" variant="outline" onClick={handleWish} aria-label="Add to wishlist">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 rounded-lg border bg-white p-3 text-center text-xs">
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-5 w-5 text-primary" /> Free shipping ₹999+
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-5 w-5 text-primary" /> Secure payment
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="h-5 w-5 text-primary" /> 7-day returns
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: description / specs / reviews */}
      <div className="mt-10">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            <div className="rounded-lg border bg-white p-5 text-muted-foreground whitespace-pre-line">
              {product.description || 'No description available.'}
            </div>
          </TabsContent>

          <TabsContent value="specs">
            <div className="rounded-lg border bg-white p-5">
              {product.specifications && Object.keys(product.specifications).length > 0 ? (
                <dl className="divide-y">
                  {Object.entries(product.specifications).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-3 gap-2 py-2 text-sm">
                      <dt className="font-medium text-accent">{k}</dt>
                      <dd className="col-span-2 text-muted-foreground">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted-foreground">No specifications listed.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {reviews.length === 0 ? (
                  <div className="rounded-lg border bg-white p-6 text-center text-muted-foreground">
                    No reviews yet. Be the first to review!
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-accent">{r.user_name}</span>
                          {r.is_verified && (
                            <Badge variant="success" className="gap-1">
                              <Check className="h-3 w-3" /> Verified
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                      </div>
                      <div className="mt-1 flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('h-4 w-4', i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted')} />
                        ))}
                      </div>
                      {r.title && <p className="mt-1 font-medium text-accent">{r.title}</p>}
                      {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))
                )}
              </div>
              <div>
                <ReviewForm productId={product.id} onSubmitted={reloadReviews} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-accent">Related Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {related.slice(0, 5).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
