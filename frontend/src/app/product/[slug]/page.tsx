'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { getProductBySlug, getRelated } from '@/lib/store';
import { Product } from '@/lib/types';
import { ProductDetail } from './product-detail';
import { Button } from '@/components/ui/button';

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getProductBySlug(slug)
      .then(async (p) => {
        setProduct(p);
        if (p?.category_slug) setRelated(await getRelated(p.category_slug, p.id));
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="container flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!product) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-xl font-bold text-accent">Product not found</h1>
        <Button asChild className="mt-4"><Link href="/products">Browse products</Link></Button>
      </div>
    );
  }

  return <ProductDetail product={product} related={related} reviews={[]} />;
}
