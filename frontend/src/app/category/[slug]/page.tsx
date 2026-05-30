import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { serverFetch } from '@/lib/server-api';
import { Category } from '@/lib/types';
import { CategoryProducts } from './category-products';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await serverFetch<{ data: Category }>(`/categories/${slug}`);
  const category = res?.data;
  if (!category) return { title: 'Category' };
  return {
    title: category.name,
    description: category.description || `Shop ${category.name} at Modern Shop.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const res = await serverFetch<{ data: Category }>(`/categories/${slug}`);
  const category = res?.data;
  if (!category) notFound();

  return (
    <div className="container py-6">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary to-primary-700 p-8 text-white">
        <h1 className="text-2xl font-extrabold md:text-3xl">{category.name}</h1>
        {category.description && <p className="mt-1 max-w-xl text-white/90">{category.description}</p>}
      </div>
      <CategoryProducts slug={slug} />
    </div>
  );
}
