import { Request, Response } from 'express';
import { query } from '../db/pool';
import { env } from '../config/env';

export const seoController = {
  async sitemap(_req: Request, res: Response) {
    const base = env.clientUrl.replace(/\/$/, '');
    const products = await query<{ slug: string; updated_at: string }>(
      'SELECT slug, updated_at FROM products WHERE is_active = TRUE'
    );
    const categories = await query<{ slug: string; updated_at: string }>(
      'SELECT slug, updated_at FROM categories WHERE is_active = TRUE'
    );
    const staticUrls = ['', '/products', '/cart', '/login', '/register'];

    const urls = [
      ...staticUrls.map((u) => `<url><loc>${base}${u}</loc><changefreq>daily</changefreq></url>`),
      ...categories.rows.map(
        (c) =>
          `<url><loc>${base}/category/${c.slug}</loc><lastmod>${new Date(c.updated_at)
            .toISOString()
            .slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`
      ),
      ...products.rows.map(
        (p) =>
          `<url><loc>${base}/product/${p.slug}</loc><lastmod>${new Date(p.updated_at)
            .toISOString()
            .slice(0, 10)}</lastmod><changefreq>weekly</changefreq></url>`
      ),
    ].join('');

    res.header('Content-Type', 'application/xml');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
    );
  },

  robots(_req: Request, res: Response) {
    const base = env.clientUrl.replace(/\/$/, '');
    res.header('Content-Type', 'text/plain');
    res.send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /profile\n\nSitemap: ${env.apiUrl}/sitemap.xml\n`
    );
  },
};
