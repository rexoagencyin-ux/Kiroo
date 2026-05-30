import { serverFetch } from '@/lib/server-api';
import { Banner, Category, Product } from '@/lib/types';
import { HeroSlider } from '@/components/home/hero-slider';
import { CategoryGrid } from '@/components/home/category-grid';
import { ProductRow } from '@/components/home/product-row';
import { FlashSale } from '@/components/home/flash-sale';
import { PromoBanners } from '@/components/home/promo-banners';
import { Testimonials } from '@/components/home/testimonials';
import { FeatureStrip } from '@/components/home/feature-strip';
import { SectionHeading } from '@/components/home/section-heading';

export const revalidate = 60;

interface HomeData {
  featured: Product[];
  trending: Product[];
  newArrivals: Product[];
  flashSale: Product[];
}

export default async function HomePage() {
  const [bannersRes, categoriesRes, home] = await Promise.all([
    serverFetch<{ data: Banner[] }>('/banners'),
    serverFetch<{ data: Category[] }>('/categories'),
    serverFetch<HomeData>('/products/home'),
  ]);

  const heroBanners = (bannersRes?.data ?? []).filter((b) => b.position === 'hero');
  const promoBanners = (bannersRes?.data ?? []).filter((b) => b.position === 'promo');
  const categories = categoriesRes?.data ?? [];
  const data = home ?? { featured: [], trending: [], newArrivals: [], flashSale: [] };

  return (
    <div className="pb-10">
      <HeroSlider banners={heroBanners} />

      <FeatureStrip />

      {categories.length > 0 && (
        <section className="container mt-10">
          <SectionHeading title="Shop by Category" href="/products" />
          <CategoryGrid categories={categories} />
        </section>
      )}

      {data.flashSale.length > 0 && <FlashSale products={data.flashSale} />}

      {data.featured.length > 0 && (
        <section className="container mt-10">
          <SectionHeading title="Featured Products" subtitle="Hand-picked favourites" href="/products?filter=featured" />
          <ProductRow products={data.featured} />
        </section>
      )}

      {promoBanners.length > 0 && <PromoBanners banners={promoBanners} />}

      {data.trending.length > 0 && (
        <section className="container mt-10">
          <SectionHeading title="Trending Now" subtitle="What everyone is buying" href="/products?filter=trending" />
          <ProductRow products={data.trending} />
        </section>
      )}

      {data.newArrivals.length > 0 && (
        <section className="container mt-10">
          <SectionHeading title="New Arrivals" subtitle="Fresh drops just for you" href="/products?filter=new" />
          <ProductRow products={data.newArrivals} />
        </section>
      )}

      <Testimonials />
    </div>
  );
}
