import slugify from 'slugify';
import { pool, query, queryOne } from './pool';
import { env } from '../config/env';
import { hashPassword } from '../utils/password';
import { logger } from '../config/logger';

const CATEGORIES = [
  { name: 'Smart Watches', desc: 'Track fitness, calls & notifications in style.' },
  { name: 'Earbuds', desc: 'True wireless sound with deep bass.' },
  { name: 'Cameras', desc: 'Capture every moment in stunning detail.' },
  { name: 'Projectors', desc: 'Big-screen entertainment anywhere.' },
  { name: 'Toys', desc: 'Fun and educational toys for all ages.' },
  { name: 'Mobile Accessories', desc: 'Chargers, cases, cables & more.' },
  { name: 'Gadgets', desc: 'The latest smart gadgets and tech.' },
  { name: 'Home Electronics', desc: 'Upgrade your home with smart devices.' },
];

const IMG = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/800`;

function sampleProducts(categoryMap: Record<string, string>) {
  const base = [
    { cat: 'Smart Watches', name: 'Pulse Pro Smartwatch', price: 2499, compare: 3999, brand: 'Modern', featured: true, trending: true },
    { cat: 'Smart Watches', name: 'Active Fit GPS Watch', price: 3499, compare: 4999, brand: 'Modern', newArrival: true },
    { cat: 'Earbuds', name: 'AeroBuds X True Wireless', price: 1799, compare: 2999, brand: 'Aero', featured: true, flash: true, flashPrice: 1299 },
    { cat: 'Earbuds', name: 'BassDrop Pro Earbuds', price: 2199, compare: 3299, brand: 'Aero', trending: true },
    { cat: 'Cameras', name: 'VistaShot 4K Action Camera', price: 6999, compare: 8999, brand: 'Vista', featured: true },
    { cat: 'Cameras', name: 'SnapCam Mini Vlog Kit', price: 4499, compare: 5999, brand: 'Vista', newArrival: true },
    { cat: 'Projectors', name: 'CinemaGo Mini Projector', price: 7999, compare: 11999, brand: 'CinemaGo', trending: true, flash: true, flashPrice: 6499 },
    { cat: 'Projectors', name: 'BeamMax Full HD Projector', price: 13999, compare: 17999, brand: 'CinemaGo' },
    { cat: 'Toys', name: 'BuildBlocks STEM Robot Kit', price: 1299, compare: 1999, brand: 'PlayLab', newArrival: true },
    { cat: 'Toys', name: 'SkyRacer RC Drone', price: 2599, compare: 3499, brand: 'PlayLab', featured: true },
    { cat: 'Mobile Accessories', name: 'TurboCharge 65W GaN Charger', price: 1499, compare: 2299, brand: 'Volt', trending: true },
    { cat: 'Mobile Accessories', name: 'GripShield Magnetic Case', price: 599, compare: 999, brand: 'Volt' },
    { cat: 'Gadgets', name: 'AirTag Smart Tracker', price: 999, compare: 1599, brand: 'Modern', newArrival: true },
    { cat: 'Gadgets', name: 'LumiLamp Smart Desk Light', price: 1899, compare: 2599, brand: 'Modern', featured: true },
    { cat: 'Home Electronics', name: 'PureAir Smart Purifier', price: 8999, compare: 11999, brand: 'PureLiving', trending: true },
    { cat: 'Home Electronics', name: 'BrewMaster Coffee Machine', price: 5499, compare: 7499, brand: 'PureLiving', flash: true, flashPrice: 4799 },
  ];
  return base.map((p, i) => ({
    ...p,
    categoryId: categoryMap[p.cat],
    sku: `MS-${String(i + 1).padStart(4, '0')}`,
    stock: 25 + ((i * 7) % 40),
    images: [IMG(p.name), IMG(p.name + '-2'), IMG(p.name + '-3')],
    specs: {
      Brand: p.brand,
      Warranty: '1 Year',
      'In the box': '1 unit, user manual, warranty card',
    },
  }));
}

async function seed() {
  logger.info('Seeding database…');

  // 1. Admin user
  const adminHash = await hashPassword(env.admin.password);
  await query(
    `INSERT INTO users (name, email, password_hash, role, is_verified, provider)
     VALUES ($1,$2,$3,'admin',TRUE,'email')
     ON CONFLICT (email) DO UPDATE SET role='admin', password_hash=EXCLUDED.password_hash, is_verified=TRUE`,
    [env.admin.name, env.admin.email, adminHash]
  );
  logger.info(`Admin ready: ${env.admin.email}`);

  // 2. Categories
  const categoryMap: Record<string, string> = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const slug = slugify(c.name, { lower: true, strict: true });
    const row = await queryOne<{ id: string }>(
      `INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,TRUE)
       ON CONFLICT (slug) DO UPDATE SET description=EXCLUDED.description, image_url=EXCLUDED.image_url
       RETURNING id`,
      [c.name, slug, c.desc, IMG(c.name), i]
    );
    if (row) categoryMap[c.name] = row.id;
  }
  logger.info(`Seeded ${CATEGORIES.length} categories`);

  // 3. Products
  const products = sampleProducts(categoryMap);
  for (const p of products) {
    const slug = slugify(p.name, { lower: true, strict: true });
    await query(
      `INSERT INTO products
        (name, slug, description, short_desc, brand, category_id, price, compare_price, sku, stock,
         images, specifications, tags, is_featured, is_trending, is_new_arrival, is_flash_sale, flash_price,
         flash_ends_at, is_active, rating_avg, rating_count, sold_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
         CASE WHEN $17 THEN NOW() + INTERVAL '3 days' ELSE NULL END, TRUE, $19, $20, $21)
       ON CONFLICT (slug) DO NOTHING`,
      [
        p.name,
        slug,
        `${p.name} — premium quality from ${p.brand}. Built with the latest technology for an exceptional everyday experience.`,
        `${p.brand} • ${p.cat}`,
        p.brand,
        p.categoryId,
        p.price,
        p.compare,
        p.sku,
        p.stock,
        JSON.stringify(p.images),
        JSON.stringify(p.specs),
        [p.cat.toLowerCase(), p.brand.toLowerCase()],
        !!p.featured,
        !!p.trending,
        !!p.newArrival,
        !!p.flash,
        p.flashPrice ?? null,
        Number((4 + Math.random()).toFixed(2)) > 5 ? 5 : Number((4 + Math.random()).toFixed(2)),
        Math.floor(10 + Math.random() * 200),
        Math.floor(5 + Math.random() * 500),
      ]
    );
  }
  logger.info(`Seeded ${products.length} products`);

  // 4. Banners
  const banners = [
    { title: 'Premium Tech, Modern Prices', subtitle: 'Up to 40% off smart watches & earbuds', cta: 'Shop Deals', link: '/products?sort=discount', pos: 'hero', img: 'https://picsum.photos/seed/hero1/1600/600' },
    { title: 'New Arrivals Are Here', subtitle: 'Discover the latest gadgets', cta: 'Explore', link: '/products?filter=new', pos: 'hero', img: 'https://picsum.photos/seed/hero2/1600/600' },
    { title: 'Flash Sale Live', subtitle: 'Limited time only', cta: 'Grab Now', link: '/products?filter=flash', pos: 'hero', img: 'https://picsum.photos/seed/hero3/1600/600' },
    { title: 'Free shipping over ₹999', subtitle: '', cta: 'Shop', link: '/products', pos: 'promo', img: 'https://picsum.photos/seed/promo1/800/400' },
    { title: 'Home Electronics Sale', subtitle: 'Smart living starts here', cta: 'Discover', link: '/category/home-electronics', pos: 'promo', img: 'https://picsum.photos/seed/promo2/800/400' },
  ];
  await query('DELETE FROM banners');
  for (let i = 0; i < banners.length; i++) {
    const b = banners[i];
    await query(
      `INSERT INTO banners (title, subtitle, image_url, link_url, cta_label, position, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
      [b.title, b.subtitle, b.img, b.link, b.cta, b.pos, i]
    );
  }
  logger.info(`Seeded ${banners.length} banners`);

  // 5. Coupons
  const coupons = [
    { code: 'WELCOME10', type: 'percentage', value: 10, min: 499, max: 500, desc: '10% off your first order' },
    { code: 'FLAT200', type: 'fixed', value: 200, min: 1499, max: null, desc: 'Flat ₹200 off above ₹1499' },
    { code: 'MEGA25', type: 'percentage', value: 25, min: 2999, max: 1500, desc: '25% off above ₹2999' },
  ];
  for (const c of coupons) {
    await query(
      `INSERT INTO coupons (code, description, type, value, min_order, max_discount, usage_limit, per_user_limit, expires_at, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,1000,5, NOW() + INTERVAL '60 days', TRUE)
       ON CONFLICT (code) DO NOTHING`,
      [c.code, c.desc, c.type, c.value, c.min, c.max]
    );
  }
  logger.info(`Seeded ${coupons.length} coupons`);

  logger.info('Seed complete ✔');
}

seed()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Seed failed', err);
    pool.end().finally(() => process.exit(1));
  });
