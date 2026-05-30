import { Request, Response } from 'express';
import { query, queryOne, withTransaction } from '../db/pool';
import { ApiError } from '../utils/ApiError';
import { computeBreakdown, generateOrderNumber } from '../utils/pricing';
import { loadCart, resolveCoupon } from './cart.controller';
import { emailService } from '../services/email.service';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface AddressInput {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
}

const STATUS_TIMELINE = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export const orderController = {
  /**
   * Create an order from the user's server-side cart.
   * For COD: order is placed immediately.
   * For Razorpay: order is created in 'pending'/'payment pending' state and a
   * Razorpay order id is returned (created via /payments/create-order separately,
   * or set here when paymentMethod=razorpay).
   */
  async create(req: Request, res: Response) {
    const userId = req.user!.sub;
    const { paymentMethod, addressId, address, couponCode, notes } = req.body as {
      paymentMethod: 'razorpay' | 'cod';
      addressId?: string;
      address?: AddressInput;
      couponCode?: string;
      notes?: string;
    };

    const items = await loadCart(userId);
    if (items.length === 0) throw ApiError.badRequest('Your cart is empty');

    // Resolve shipping address
    let shippingAddress: AddressInput;
    if (addressId) {
      const row = await queryOne<AddressInput>(
        'SELECT full_name, phone, line1, line2, city, state, postal_code, country FROM addresses WHERE id = $1 AND user_id = $2',
        [addressId, userId]
      );
      if (!row) throw ApiError.badRequest('Invalid shipping address');
      shippingAddress = row;
    } else if (address) {
      shippingAddress = address;
    } else {
      throw ApiError.badRequest('A shipping address is required');
    }

    const lines = items.map((it) => ({ price: it.price, quantity: it.quantity }));
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const coupon = await resolveCoupon(couponCode, subtotal);
    const breakdown = computeBreakdown(lines, coupon);

    const user = await queryOne<{ name: string; email: string }>(
      'SELECT name, email FROM users WHERE id = $1',
      [userId]
    );
    if (!user) throw ApiError.unauthorized();

    const orderNumber = generateOrderNumber();

    const order = await withTransaction(async (client) => {
      // 1. Lock & validate stock
      for (const it of items) {
        const stockRes = await client.query<{ stock: number; name: string }>(
          'SELECT stock, name FROM products WHERE id = $1 FOR UPDATE',
          [it.product_id]
        );
        const row = stockRes.rows[0];
        if (!row || row.stock < it.quantity) {
          throw ApiError.badRequest(`Insufficient stock for ${it.name}`);
        }
      }

      // 2. Create order
      const orderRes = await client.query<{ id: string }>(
        `INSERT INTO orders
          (order_number, user_id, email, status, payment_method, payment_status,
           subtotal, discount, tax, shipping_fee, total, coupon_code, shipping_address, notes)
         VALUES ($1,$2,$3,'pending',$4,'pending',$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          orderNumber,
          userId,
          user.email,
          paymentMethod,
          breakdown.subtotal,
          breakdown.discount,
          breakdown.tax,
          breakdown.shippingFee,
          breakdown.total,
          couponCode?.toUpperCase() ?? null,
          JSON.stringify(shippingAddress),
          notes ?? null,
        ]
      );
      const orderId = orderRes.rows[0].id;

      // 3. Order items + decrement stock + sold count
      for (const it of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, name, image_url, variant, unit_price, quantity, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [orderId, it.product_id, it.name, it.image, it.variant, it.price, it.quantity, it.lineTotal]
        );
        await client.query(
          'UPDATE products SET stock = stock - $1, sold_count = sold_count + $1 WHERE id = $2',
          [it.quantity, it.product_id]
        );
      }

      // 4. Coupon redemption
      if (coupon && couponCode) {
        const cRow = await client.query<{ id: string }>(
          'SELECT id FROM coupons WHERE code = $1',
          [couponCode.toUpperCase()]
        );
        if (cRow.rows[0]) {
          await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [
            cRow.rows[0].id,
          ]);
          await client.query(
            'INSERT INTO coupon_redemptions (coupon_id, user_id, order_id) VALUES ($1,$2,$3)',
            [cRow.rows[0].id, userId, orderId]
          );
        }
      }

      // 5. Payment record
      await client.query(
        `INSERT INTO payments (order_id, provider, amount, currency, status)
         VALUES ($1,$2,$3,$4,$5)`,
        [orderId, paymentMethod, breakdown.total, env.store.currency, paymentMethod === 'cod' ? 'created' : 'created']
      );

      // 6. COD => confirm immediately; clear cart
      if (paymentMethod === 'cod') {
        await client.query(
          "UPDATE orders SET status = 'confirmed' WHERE id = $1",
          [orderId]
        );
      }
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      return { id: orderId };
    });

    // Notifications + email (outside transaction)
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1,'order','Order placed',$2,$3)`,
      [userId, `Your order ${orderNumber} has been placed.`, `/track/${orderNumber}`]
    );

    if (paymentMethod === 'cod') {
      await emailService.sendOrderConfirmation(user.email, user.name, {
        order_number: orderNumber,
        total: breakdown.total,
        items: items.map((it) => ({ name: it.name, quantity: it.quantity, total: it.lineTotal })),
        trackUrl: `${env.clientUrl}/track/${orderNumber}`,
      });
    }

    res.status(201).json({
      success: true,
      order: { id: order.id, order_number: orderNumber, ...breakdown, paymentMethod },
    });
  },

  async listMine(req: Request, res: Response) {
    const rows = await query(
      `SELECT o.*,
              COALESCE(json_agg(json_build_object(
                'name', oi.name, 'image_url', oi.image_url, 'quantity', oi.quantity, 'total', oi.total
              )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user!.sub]
    );
    res.json({ success: true, data: rows.rows });
  },

  async getOne(req: Request, res: Response) {
    const order = await queryOne(
      `SELECT o.*,
              COALESCE(json_agg(json_build_object(
                'id', oi.id, 'product_id', oi.product_id, 'name', oi.name, 'image_url', oi.image_url,
                'variant', oi.variant, 'unit_price', oi.unit_price, 'quantity', oi.quantity, 'total', oi.total
              )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [req.params.id, req.user!.sub]
    );
    if (!order) throw ApiError.notFound('Order not found');
    res.json({ success: true, data: order });
  },

  /** Public-ish tracking by order number (still requires the number, acts as a token). */
  async track(req: Request, res: Response) {
    const order = await queryOne<{
      status: string;
      placed_at: string;
      delivered_at: string | null;
      cancelled_at: string | null;
      tracking_number: string | null;
      courier: string | null;
      order_number: string;
      payment_status: string;
      payment_method: string;
      total: string;
      awb_code: string | null;
    }>(
      `SELECT order_number, status, placed_at, delivered_at, cancelled_at, tracking_number,
              courier, payment_status, payment_method, total, awb_code
       FROM orders WHERE order_number = $1`,
      [req.params.orderNumber]
    );
    if (!order) throw ApiError.notFound('Order not found');

    const items = await query(
      'SELECT name, image_url, quantity, total FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)',
      [order.order_number]
    );

    const currentIndex = STATUS_TIMELINE.indexOf(order.status);
    const timeline = STATUS_TIMELINE.map((s, idx) => ({
      status: s,
      done: order.status === 'cancelled' ? false : idx <= currentIndex,
      current: s === order.status,
    }));

    res.json({
      success: true,
      data: {
        ...order,
        items: items.rows,
        timeline: order.status === 'cancelled' ? [{ status: 'cancelled', done: true, current: true }] : timeline,
      },
    });
  },

  async cancel(req: Request, res: Response) {
    const order = await queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.sub]
    );
    if (!order) throw ApiError.notFound('Order not found');
    if (['shipped', 'delivered', 'cancelled', 'returned'].includes(order.status)) {
      throw ApiError.badRequest(`Order cannot be cancelled (status: ${order.status})`);
    }
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1",
        [order.id]
      );
      // restock
      const its = await client.query<{ product_id: string; quantity: number }>(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [order.id]
      );
      for (const it of its.rows) {
        if (it.product_id) {
          await client.query(
            'UPDATE products SET stock = stock + $1, sold_count = GREATEST(sold_count - $1, 0) WHERE id = $2',
            [it.quantity, it.product_id]
          );
        }
      }
    });
    logger.info(`Order ${order.id} cancelled by user`);
    res.json({ success: true, message: 'Order cancelled' });
  },
};
