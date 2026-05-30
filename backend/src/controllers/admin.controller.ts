import { Request, Response } from 'express';
import slugify from 'slugify';
import { query, queryOne, withTransaction } from '../db/pool';
import { ApiError } from '../utils/ApiError';
import { recalcRating } from './review.controller';
import { emailService } from '../services/email.service';
import { shiprocketService } from '../services/shiprocket.service';
import { env } from '../config/env';
import { logger } from '../config/logger';

async function uniqueSlug(base: string, table: 'products' | 'categories', ignoreId?: string): Promise<string> {
  const root = slugify(base, { lower: true, strict: true });
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM ${table} WHERE slug = $1 ${ignoreId ? 'AND id <> $2' : ''}`,
      ignoreId ? [slug, ignoreId] : [slug]
    );
    if (!existing) return slug;
    slug = `${root}-${n++}`;
  }
}

export const adminController = {
  // ---------------------------------------------------------------- DASHBOARD
  async dashboard(_req: Request, res: Response) {
    const [revenue, orders, users, products, lowStock, recentOrders, statusBreakdown] =
      await Promise.all([
        queryOne<{ total: string; today: string; month: string }>(
          `SELECT
             COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid' OR payment_method = 'cod'),0) AS total,
             COALESCE(SUM(total) FILTER (WHERE (payment_status='paid' OR payment_method='cod') AND created_at::date = NOW()::date),0) AS today,
             COALESCE(SUM(total) FILTER (WHERE (payment_status='paid' OR payment_method='cod') AND created_at >= date_trunc('month', NOW())),0) AS month
           FROM orders WHERE status <> 'cancelled'`
        ),
        queryOne<{ total: number; pending: number; today: number }>(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status='pending')::int AS pending,
                  COUNT(*) FILTER (WHERE created_at::date = NOW()::date)::int AS today
           FROM orders`
        ),
        queryOne<{ total: number; today: number }>(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE created_at::date = NOW()::date)::int AS today
           FROM users WHERE role = 'customer'`
        ),
        queryOne<{ total: number; active: number }>(
          `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active FROM products`
        ),
        queryOne<{ count: number }>(
          `SELECT COUNT(*)::int AS count FROM products WHERE stock <= low_stock_threshold AND is_active = TRUE`
        ),
        query(
          `SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.created_at, u.name AS customer
           FROM orders o LEFT JOIN users u ON u.id = o.user_id
           ORDER BY o.created_at DESC LIMIT 8`
        ),
        query<{ status: string; count: number }>(
          `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`
        ),
      ]);

    res.json({
      success: true,
      data: {
        revenue: {
          total: Number(revenue?.total ?? 0),
          today: Number(revenue?.today ?? 0),
          month: Number(revenue?.month ?? 0),
        },
        orders,
        users,
        products,
        lowStock: lowStock?.count ?? 0,
        recentOrders: recentOrders.rows,
        statusBreakdown: statusBreakdown.rows,
      },
    });
  },

  // ---------------------------------------------------------------- ANALYTICS
  async analytics(req: Request, res: Response) {
    const days = Math.min(365, Math.max(7, parseInt((req.query.days as string) ?? '30', 10)));

    const salesByDay = await query<{ day: string; revenue: string; orders: number }>(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              COALESCE(SUM(o.total),0) AS revenue,
              COUNT(o.id)::int AS orders
       FROM generate_series(NOW()::date - ($1::int - 1), NOW()::date, '1 day') AS d(day)
       LEFT JOIN orders o ON o.created_at::date = d.day AND o.status <> 'cancelled'
       GROUP BY d.day ORDER BY d.day`,
      [days]
    );

    const topProducts = await query(
      `SELECT p.id, p.name, p.images, SUM(oi.quantity)::int AS units, SUM(oi.total) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
       JOIN products p ON p.id = oi.product_id
       WHERE o.created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY p.id ORDER BY revenue DESC LIMIT 10`,
      [days]
    );

    const categorySales = await query(
      `SELECT c.name, COALESCE(SUM(oi.total),0) AS revenue
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
       GROUP BY c.name ORDER BY revenue DESC`
    );

    res.json({
      success: true,
      data: {
        salesByDay: salesByDay.rows.map((r) => ({
          day: r.day,
          revenue: Number(r.revenue),
          orders: r.orders,
        })),
        topProducts: topProducts.rows,
        categorySales: categorySales.rows.map((r) => ({ name: r.name, revenue: Number(r.revenue) })),
      },
    });
  },

  // ---------------------------------------------------------------- PRODUCTS
  async listProducts(req: Request, res: Response) {
    const { q, page = '1', limit = '20', category, status } = req.query as Record<string, string>;
    const where: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (q) {
      where.push(`(p.name ILIKE $${i} OR p.sku ILIKE $${i})`);
      params.push(`%${q}%`);
      i++;
    }
    if (category) {
      where.push(`p.category_id = $${i}`);
      params.push(category);
      i++;
    }
    if (status === 'active') where.push('p.is_active = TRUE');
    if (status === 'inactive') where.push('p.is_active = FALSE');
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const total = await queryOne<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM products p ${whereSql}`,
      params
    );
    const rows = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ${whereSql} ORDER BY p.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limitNum, (pageNum - 1) * limitNum]
    );
    res.json({
      success: true,
      data: rows.rows,
      pagination: { page: pageNum, limit: limitNum, total: total?.c ?? 0, totalPages: Math.ceil((total?.c ?? 0) / limitNum) },
    });
  },

  async createProduct(req: Request, res: Response) {
    const b = req.body as Record<string, unknown>;
    const slug = await uniqueSlug((b.name as string) ?? 'product', 'products');
    const row = await queryOne(
      `INSERT INTO products
        (name, slug, description, short_desc, brand, category_id, price, compare_price, cost_price,
         sku, stock, low_stock_threshold, images, specifications, variants, tags,
         is_featured, is_trending, is_new_arrival, is_flash_sale, flash_price, flash_ends_at,
         is_active, meta_title, meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [
        b.name,
        slug,
        b.description ?? null,
        b.short_desc ?? null,
        b.brand ?? null,
        b.category_id ?? null,
        b.price ?? 0,
        b.compare_price ?? null,
        b.cost_price ?? null,
        b.sku ?? null,
        b.stock ?? 0,
        b.low_stock_threshold ?? 5,
        JSON.stringify(b.images ?? []),
        JSON.stringify(b.specifications ?? {}),
        JSON.stringify(b.variants ?? []),
        (b.tags as string[]) ?? [],
        !!b.is_featured,
        !!b.is_trending,
        !!b.is_new_arrival,
        !!b.is_flash_sale,
        b.flash_price ?? null,
        b.flash_ends_at ?? null,
        b.is_active === undefined ? true : !!b.is_active,
        b.meta_title ?? null,
        b.meta_description ?? null,
      ]
    );
    res.status(201).json({ success: true, data: row });
  },

  async updateProduct(req: Request, res: Response) {
    const b = req.body as Record<string, unknown>;
    const existing = await queryOne<{ id: string; name: string; slug: string }>(
      'SELECT id, name, slug FROM products WHERE id = $1',
      [req.params.id]
    );
    if (!existing) throw ApiError.notFound('Product not found');
    let slug = existing.slug;
    if (b.name && b.name !== existing.name) slug = await uniqueSlug(b.name as string, 'products', existing.id);

    const row = await queryOne(
      `UPDATE products SET
         name = COALESCE($1, name), slug = $2,
         description = COALESCE($3, description), short_desc = COALESCE($4, short_desc),
         brand = COALESCE($5, brand), category_id = COALESCE($6, category_id),
         price = COALESCE($7, price), compare_price = $8, cost_price = $9,
         sku = COALESCE($10, sku), stock = COALESCE($11, stock),
         low_stock_threshold = COALESCE($12, low_stock_threshold),
         images = COALESCE($13, images), specifications = COALESCE($14, specifications),
         variants = COALESCE($15, variants), tags = COALESCE($16, tags),
         is_featured = COALESCE($17, is_featured), is_trending = COALESCE($18, is_trending),
         is_new_arrival = COALESCE($19, is_new_arrival), is_flash_sale = COALESCE($20, is_flash_sale),
         flash_price = $21, flash_ends_at = $22, is_active = COALESCE($23, is_active),
         meta_title = COALESCE($24, meta_title), meta_description = COALESCE($25, meta_description)
       WHERE id = $26 RETURNING *`,
      [
        b.name ?? null,
        slug,
        b.description ?? null,
        b.short_desc ?? null,
        b.brand ?? null,
        b.category_id ?? null,
        b.price ?? null,
        b.compare_price ?? null,
        b.cost_price ?? null,
        b.sku ?? null,
        b.stock ?? null,
        b.low_stock_threshold ?? null,
        b.images ? JSON.stringify(b.images) : null,
        b.specifications ? JSON.stringify(b.specifications) : null,
        b.variants ? JSON.stringify(b.variants) : null,
        (b.tags as string[]) ?? null,
        b.is_featured ?? null,
        b.is_trending ?? null,
        b.is_new_arrival ?? null,
        b.is_flash_sale ?? null,
        b.flash_price ?? null,
        b.flash_ends_at ?? null,
        b.is_active ?? null,
        b.meta_title ?? null,
        b.meta_description ?? null,
        req.params.id,
      ]
    );
    res.json({ success: true, data: row });
  },

  async deleteProduct(req: Request, res: Response) {
    const r = await query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) throw ApiError.notFound('Product not found');
    res.json({ success: true, message: 'Product deleted' });
  },

  /** Bulk upload products (array of product objects). */
  async bulkUploadProducts(req: Request, res: Response) {
    const { products } = req.body as { products: Record<string, unknown>[] };
    if (!Array.isArray(products) || products.length === 0) {
      throw ApiError.badRequest('products array is required');
    }
    let created = 0;
    const errors: { index: number; error: string }[] = [];
    for (let idx = 0; idx < products.length; idx++) {
      const b = products[idx];
      try {
        const slug = await uniqueSlug((b.name as string) ?? `product-${idx}`, 'products');
        await query(
          `INSERT INTO products (name, slug, description, brand, category_id, price, compare_price, sku, stock, images, specifications, tags, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)`,
          [
            b.name,
            slug,
            b.description ?? null,
            b.brand ?? null,
            b.category_id ?? null,
            b.price ?? 0,
            b.compare_price ?? null,
            b.sku ?? null,
            b.stock ?? 0,
            JSON.stringify(b.images ?? []),
            JSON.stringify(b.specifications ?? {}),
            (b.tags as string[]) ?? [],
          ]
        );
        created++;
      } catch (e) {
        errors.push({ index: idx, error: (e as Error).message });
      }
    }
    res.status(201).json({ success: true, created, failed: errors.length, errors });
  },

  async updateStock(req: Request, res: Response) {
    const { stock } = req.body as { stock: number };
    const row = await queryOne(
      'UPDATE products SET stock = $1 WHERE id = $2 RETURNING id, name, stock',
      [stock, req.params.id]
    );
    if (!row) throw ApiError.notFound('Product not found');
    res.json({ success: true, data: row });
  },

  // ---------------------------------------------------------------- CATEGORIES
  async createCategory(req: Request, res: Response) {
    const b = req.body as Record<string, unknown>;
    const slug = await uniqueSlug((b.name as string) ?? 'category', 'categories');
    const row = await queryOne(
      `INSERT INTO categories (name, slug, description, image_url, parent_id, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        b.name,
        slug,
        b.description ?? null,
        b.image_url ?? null,
        b.parent_id ?? null,
        b.sort_order ?? 0,
        b.is_active === undefined ? true : !!b.is_active,
      ]
    );
    res.status(201).json({ success: true, data: row });
  },

  async updateCategory(req: Request, res: Response) {
    const b = req.body as Record<string, unknown>;
    const existing = await queryOne<{ id: string; name: string; slug: string }>(
      'SELECT id, name, slug FROM categories WHERE id = $1',
      [req.params.id]
    );
    if (!existing) throw ApiError.notFound('Category not found');
    let slug = existing.slug;
    if (b.name && b.name !== existing.name) slug = await uniqueSlug(b.name as string, 'categories', existing.id);
    const row = await queryOne(
      `UPDATE categories SET
         name = COALESCE($1, name), slug = $2, description = COALESCE($3, description),
         image_url = COALESCE($4, image_url), parent_id = $5, sort_order = COALESCE($6, sort_order),
         is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
      [
        b.name ?? null,
        slug,
        b.description ?? null,
        b.image_url ?? null,
        b.parent_id ?? null,
        b.sort_order ?? null,
        b.is_active ?? null,
        req.params.id,
      ]
    );
    res.json({ success: true, data: row });
  },

  async deleteCategory(req: Request, res: Response) {
    const r = await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) throw ApiError.notFound('Category not found');
    res.json({ success: true, message: 'Category deleted' });
  },

  // ---------------------------------------------------------------- ORDERS
  async listOrders(req: Request, res: Response) {
    const { q, status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const where: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (status) {
      where.push(`o.status = $${i}`);
      params.push(status);
      i++;
    }
    if (q) {
      where.push(`(o.order_number ILIKE $${i} OR o.email ILIKE $${i})`);
      params.push(`%${q}%`);
      i++;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const total = await queryOne<{ c: number }>(`SELECT COUNT(*)::int AS c FROM orders o ${whereSql}`, params);
    const rows = await query(
      `SELECT o.*, u.name AS customer_name
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ${whereSql} ORDER BY o.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limitNum, (pageNum - 1) * limitNum]
    );
    res.json({
      success: true,
      data: rows.rows,
      pagination: { page: pageNum, limit: limitNum, total: total?.c ?? 0, totalPages: Math.ceil((total?.c ?? 0) / limitNum) },
    });
  },

  async getOrder(req: Request, res: Response) {
    const order = await queryOne(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              COALESCE(json_agg(json_build_object(
                'id', oi.id, 'name', oi.name, 'image_url', oi.image_url, 'variant', oi.variant,
                'unit_price', oi.unit_price, 'quantity', oi.quantity, 'total', oi.total
              )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 GROUP BY o.id, u.name, u.email, u.phone`,
      [req.params.id]
    );
    if (!order) throw ApiError.notFound('Order not found');
    res.json({ success: true, data: order });
  },

  async updateOrderStatus(req: Request, res: Response) {
    const { status, trackingNumber, courier } = req.body as {
      status: string;
      trackingNumber?: string;
      courier?: string;
    };
    const allowed = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!allowed.includes(status)) throw ApiError.badRequest('Invalid status');

    const order = await queryOne<{ order_number: string; email: string }>(
      `UPDATE orders SET
         status = $1,
         tracking_number = COALESCE($2, tracking_number),
         courier = COALESCE($3, courier),
         delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
         cancelled_at = CASE WHEN $1 = 'cancelled' THEN NOW() ELSE cancelled_at END
       WHERE id = $4 RETURNING order_number, email`,
      [status, trackingNumber ?? null, courier ?? null, req.params.id]
    );
    if (!order) throw ApiError.notFound('Order not found');

    await emailService.sendOrderStatus(
      order.email,
      order.order_number,
      status,
      `${env.clientUrl}/track/${order.order_number}`
    );
    res.json({ success: true, message: `Order marked ${status}` });
  },

  /** Create a Shiprocket shipment for an order on demand. */
  async shipOrder(req: Request, res: Response) {
    const order = await queryOne<Record<string, unknown>>('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!order) throw ApiError.notFound('Order not found');
    const items = await query<{ name: string; quantity: number; unit_price: string; product_id: string }>(
      'SELECT name, quantity, unit_price, product_id FROM order_items WHERE order_id = $1',
      [req.params.id]
    );
    const addr = order.shipping_address as Record<string, string>;
    const [firstName, ...rest] = (addr.full_name ?? 'Customer').split(' ');
    try {
      const created = await shiprocketService.createOrder({
        order_id: order.order_number as string,
        order_date: new Date().toISOString().slice(0, 10),
        billing_customer_name: firstName,
        billing_last_name: rest.join(' ') || firstName,
        billing_address: addr.line1,
        billing_city: addr.city,
        billing_pincode: addr.postal_code,
        billing_state: addr.state,
        billing_country: addr.country || 'India',
        billing_email: order.email as string,
        billing_phone: addr.phone,
        payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
        sub_total: Number(order.total),
        length: 15,
        breadth: 12,
        height: 6,
        weight: 0.5,
        order_items: items.rows.map((i) => ({
          name: i.name,
          sku: i.product_id ?? i.name.slice(0, 20),
          units: i.quantity,
          selling_price: Number(i.unit_price),
        })),
      });
      await query(
        "UPDATE orders SET shiprocket_order_id = $1, shiprocket_shipment_id = $2, status = 'processing' WHERE id = $3",
        [String(created.order_id), String(created.shipment_id), req.params.id]
      );
      res.json({ success: true, data: created });
    } catch (e) {
      logger.error('Manual ship failed', e);
      throw ApiError.badRequest('Failed to create Shiprocket shipment. Check credentials/config.');
    }
  },

  /** Generate a simple invoice payload (consumed by the frontend to render/print). */
  async invoice(req: Request, res: Response) {
    const order = await queryOne(
      `SELECT o.*, u.name AS customer_name,
              COALESCE(json_agg(json_build_object(
                'name', oi.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total', oi.total
              )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 GROUP BY o.id, u.name`,
      [req.params.id]
    );
    if (!order) throw ApiError.notFound('Order not found');
    res.json({
      success: true,
      data: {
        store: { name: env.store.name, currency: env.store.currency },
        order,
        generatedAt: new Date().toISOString(),
      },
    });
  },

  // ---------------------------------------------------------------- CUSTOMERS
  async listCustomers(req: Request, res: Response) {
    const { q, page = '1', limit = '20' } = req.query as Record<string, string>;
    const where = ["role = 'customer'"];
    const params: unknown[] = [];
    let i = 1;
    if (q) {
      where.push(`(name ILIKE $${i} OR email ILIKE $${i})`);
      params.push(`%${q}%`);
      i++;
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const total = await queryOne<{ c: number }>(`SELECT COUNT(*)::int AS c FROM users ${whereSql}`, params);
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at, u.is_active,
              COUNT(o.id)::int AS order_count,
              COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'),0) AS total_spent
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
       ${whereSql}
       GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limitNum, (pageNum - 1) * limitNum]
    );
    res.json({
      success: true,
      data: rows.rows,
      pagination: { page: pageNum, limit: limitNum, total: total?.c ?? 0, totalPages: Math.ceil((total?.c ?? 0) / limitNum) },
    });
  },

  async getCustomer(req: Request, res: Response) {
    const customer = await queryOne(
      'SELECT id, name, email, phone, avatar_url, created_at, is_active, last_login_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!customer) throw ApiError.notFound('Customer not found');
    const orders = await query(
      'SELECT id, order_number, total, status, payment_status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: { customer, orders: orders.rows } });
  },

  async toggleCustomer(req: Request, res: Response) {
    const row = await queryOne(
      "UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role = 'customer' RETURNING id, is_active",
      [req.params.id]
    );
    if (!row) throw ApiError.notFound('Customer not found');
    res.json({ success: true, data: row });
  },

  // ---------------------------------------------------------------- COUPONS
  async listCoupons(_req: Request, res: Response) {
    const rows = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ success: true, data: rows.rows });
  },

  async createCoupon(req: Request, res: Response) {
    const b = req.body as Record<string, unknown>;
    const row = await queryOne(
      `INSERT INTO coupons (code, description, type, value, min_order, max_discount, usage_limit, per_user_limit, starts_at, expires_at, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        (b.code as string).toUpperCase(),
        b.description ?? null,
        b.type,
        b.value,
        b.min_order ?? 0,
        b.max_discount ?? null,
        b.usage_limit ?? null,
        b.per_user_limit ?? 1,
        b.starts_at ?? null,
        b.expires_at ?? null,
        b.is_active === undefined ? true : !!b.is_active,
      ]
    );
    res.status(201).json({ success: true, data: row });
  },

  async updateCoupon(req: Request, res: Response) {
    const b = req.body as Record<string, unknown>;
    const row = await queryOne(
      `UPDATE coupons SET
         description = COALESCE($1, description), type = COALESCE($2, type), value = COALESCE($3, value),
         min_order = COALESCE($4, min_order), max_discount = $5, usage_limit = $6,
         per_user_limit = COALESCE($7, per_user_limit), starts_at = $8, expires_at = $9,
         is_active = COALESCE($10, is_active)
       WHERE id = $11 RETURNING *`,
      [
        b.description ?? null,
        b.type ?? null,
        b.value ?? null,
        b.min_order ?? null,
        b.max_discount ?? null,
        b.usage_limit ?? null,
        b.per_user_limit ?? null,
        b.starts_at ?? null,
        b.expires_at ?? null,
        b.is_active ?? null,
        req.params.id,
      ]
    );
    if (!row) throw ApiError.notFound('Coupon not found');
    res.json({ success: true, data: row });
  },

  async deleteCoupon(req: Request, res: Response) {
    const r = await query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) throw ApiError.notFound('Coupon not found');
    res.json({ success: true, message: 'Coupon deleted' });
  },

  // ---------------------------------------------------------------- BANNERS
  async listBanners(_req: Request, res: Response) {
    const rows = await query('SELECT * FROM banners ORDER BY sort_order ASC, created_at DESC');
    res.json({ success: true, data: rows.rows });
  },

  async createBanner(req: Request, res: Response) {
    const b = req.body as Record<string, unknown>;
    const row = await queryOne(
      `INSERT INTO banners (title, subtitle, image_url, mobile_image_url, link_url, cta_label, position, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        b.title ?? null,
        b.subtitle ?? null,
        b.image_url,
        b.mobile_image_url ?? null,
        b.link_url ?? null,
        b.cta_label ?? null,
        b.position ?? 'hero',
        b.sort_order ?? 0,
        b.is_active === undefined ? true : !!b.is_active,
      ]
    );
    res.status(201).json({ success: true, data: row });
  },

  async updateBanner(req: Request, res: Response) {
    const b = req.body as Record<string, unknown>;
    const row = await queryOne(
      `UPDATE banners SET
         title = $1, subtitle = $2, image_url = COALESCE($3, image_url), mobile_image_url = $4,
         link_url = $5, cta_label = $6, position = COALESCE($7, position),
         sort_order = COALESCE($8, sort_order), is_active = COALESCE($9, is_active)
       WHERE id = $10 RETURNING *`,
      [
        b.title ?? null,
        b.subtitle ?? null,
        b.image_url ?? null,
        b.mobile_image_url ?? null,
        b.link_url ?? null,
        b.cta_label ?? null,
        b.position ?? null,
        b.sort_order ?? null,
        b.is_active ?? null,
        req.params.id,
      ]
    );
    if (!row) throw ApiError.notFound('Banner not found');
    res.json({ success: true, data: row });
  },

  async deleteBanner(req: Request, res: Response) {
    const r = await query('DELETE FROM banners WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) throw ApiError.notFound('Banner not found');
    res.json({ success: true, message: 'Banner deleted' });
  },

  // ---------------------------------------------------------------- REVIEWS
  async listReviews(req: Request, res: Response) {
    const status = (req.query.status as string) ?? 'pending';
    const rows = await query(
      `SELECT r.*, u.name AS user_name, p.name AS product_name, p.slug AS product_slug
       FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
       ${status !== 'all' ? 'WHERE r.status = $1' : ''}
       ORDER BY r.created_at DESC`,
      status !== 'all' ? [status] : []
    );
    res.json({ success: true, data: rows.rows });
  },

  async moderateReview(req: Request, res: Response) {
    const { status } = req.body as { status: 'approved' | 'rejected' };
    if (!['approved', 'rejected'].includes(status)) throw ApiError.badRequest('Invalid status');
    const review = await queryOne<{ product_id: string }>(
      'UPDATE reviews SET status = $1 WHERE id = $2 RETURNING product_id',
      [status, req.params.id]
    );
    if (!review) throw ApiError.notFound('Review not found');
    await recalcRating(review.product_id);
    res.json({ success: true, message: `Review ${status}` });
  },

  // ---------------------------------------------------------------- INVENTORY
  async inventory(req: Request, res: Response) {
    const lowOnly = req.query.low === 'true';
    const rows = await query(
      `SELECT id, name, sku, stock, low_stock_threshold, price,
              (stock <= low_stock_threshold) AS is_low
       FROM products
       WHERE is_active = TRUE ${lowOnly ? 'AND stock <= low_stock_threshold' : ''}
       ORDER BY stock ASC`
    );
    res.json({ success: true, data: rows.rows });
  },
};
