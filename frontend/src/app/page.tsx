'use client';

import { useProducts } from '@/lib/store';
import { CATEGORIES } from '@/lib/categories';
import { Category } from '@/lib/types';
import { HeroSlider } from '@/components/home/hero-slider';
import { CategoryGrid } from '@/components/home/category-grid';
import { ProductRow } from '@/components/home/product-row';
import { FlashSale } from '@/components/home/flash-sale';
import { Testimonials } from '@/components/home/testimonials';
import { FeatureStrip } from '@/components/home/feature-strip';
import { SectionHeading } from '@/components/home/section-heading';
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton';

const categoryCards: Category[] = CATEGORIES.map((c) => ({
  id: c.slug,
  name: c.name,
  slug: c.slug,
  description: null,
  image_url: c.image,
}));

export default function HomePage() {
  const { products, loading } = useProducts(true);

  const featured = products.filter((p) => p.is_featured).slice(0, 10);
  const trending = products.filter((p) => p.is_trending).slice(0, 10);
  const newArrivals = products.filter((p) => p.is_new_arrival).slice(0, 10);
  const flashSale = products.filter((p) => p.is_flash_sale).slice(0, 10);
  const latest = [...products].slice(0, 10);

  return (
    <div className="pb-10">
      <HeroSlider banners={[]} />
      <FeatureStrip />

      <section className="container mt-10">
        <SectionHeading title="Shop by Category" href="/products" />
        <CategoryGrid categories={categoryCards} />
      </section>

      {loading ? (
        <section className="container mt-10">
          <ProductGridSkeleton count={10} />
        </section>
      ) : products.length === 0 ? (
        <section className="container mt-10">
          <div className="rounded-2xl border bg-white py-16 text-center">
            <p className="text-lg font-semibold text-accent">Store is being set up 🛠️</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Products added from the admin panel will appear here instantly.
            </p>
          </div>
        </section>
      ) : (
        <>
          {flashSale.length > 0 && <FlashSale products={flashSale} />}

          {featured.length > 0 && (
            <section className="container mt-10">
              <SectionHeading title="Featured Products" subtitle="Hand-picked favourites" href="/products?filter=featured" />
              <ProductRow products={featured} />
            </section>
          )}

          {trending.length > 0 && (
            <section className="container mt-10">
              <SectionHeading title="Trending Now" subtitle="What everyone is buying" href="/products?filter=trending" />
              <ProductRow products={trending} />
            </section>
          )}

          {newArrivals.length > 0 && (
            <section className="container mt-10">
              <SectionHeading title="New Arrivals" subtitle="Fresh drops just for you" href="/products?filter=new" />
              <ProductRow products={newArrivals} />
            </section>
          )}

          <section className="container mt-10">
            <SectionHeading title="All Products" href="/products" />
            <ProductRow products={latest} />
          </section>
        </>
      )}

      <Testimonials />
    </div>
  );
}
