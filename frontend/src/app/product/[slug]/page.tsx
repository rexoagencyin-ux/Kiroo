import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { serverFetch } from '@/lib/server-api';
import { Product, Review } from '@/lib/types';
import { ProductDetail } from './product-detail';

interface Props {
  params: Promise<{ slug: string }>;
}

interface ProductResponse {
  data: Product;
  related: Product[];
  reviews: Review[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await serverFetch<ProductResponse>(`/products/${slug}`);
  const p = res?.data;
  if (!p) return { title: 'Product' };
  return {
    title: p.meta_title || p.name,
    description: p.meta_description || p.short_desc || p.description?.slice(0, 160) || p.name,
    openGraph: {
      title: p.name,
      description: p.short_desc || '',
      images: p.images?.length ? [{ url: p.images[0] }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const res = await serverFetch<ProductResponse>(`/products/${slug}`);
  if (!res?.data) notFound();

  return <ProductDetail product={res.data} related={res.related ?? []} reviews={res.reviews ?? []} />;
}
