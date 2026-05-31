export interface CategoryDef {
  name: string;
  slug: string;
  image: string;
}

/** Fixed storefront categories (used in nav, product form, and filters). */
export const CATEGORIES: CategoryDef[] = [
  { name: 'Smart Watches', slug: 'smart-watches', image: 'https://picsum.photos/seed/smart-watches/400/400' },
  { name: 'Earbuds', slug: 'earbuds', image: 'https://picsum.photos/seed/earbuds/400/400' },
  { name: 'Cameras', slug: 'cameras', image: 'https://picsum.photos/seed/cameras/400/400' },
  { name: 'Projectors', slug: 'projectors', image: 'https://picsum.photos/seed/projectors/400/400' },
  { name: 'Toys', slug: 'toys', image: 'https://picsum.photos/seed/toys/400/400' },
  { name: 'Mobile Accessories', slug: 'mobile-accessories', image: 'https://picsum.photos/seed/mobile-accessories/400/400' },
  { name: 'Gadgets', slug: 'gadgets', image: 'https://picsum.photos/seed/gadgets/400/400' },
  { name: 'Home Electronics', slug: 'home-electronics', image: 'https://picsum.photos/seed/home-electronics/400/400' },
];

export function categoryName(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}
