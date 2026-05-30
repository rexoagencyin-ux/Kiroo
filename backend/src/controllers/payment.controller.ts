import { Request, Response } from 'express';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../utils/ApiError';
import { razorpayService } from '../services/razorpay.service';
import { shiprocketService } from '../services/shiprocket.service';
import { emailService } from '../services/email.service';
import { env } from '../config/env';
import { logger } from '../config/logger';

async function fulfilWithShiprocket(orderId: string) {
  try {
    const order = await queryOne<Record<string, unknown>>('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (!order) return;
    const items = await query<{ name: string; quantity: number; unit_price: string; product_id: string }>(
      'SELECT oi.name, oi.quantity, oi.unit_price, oi.product_id FROM order_items oi WHERE oi.order_id = $1',
      [orderId]
    );
    const addr = order.shipping_address as {
      full_name: string;
      phone: string;
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    const [firstName, ...rest] = addr.full_name.split(' ');
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
      'UPDATE orders SET shiprocket_order_id = $1, shiprocket_shipment_id = $2 WHERE id = $3',
      [String(created.order_id), String(created.shipment_id), orderId]
    );
    try {
      const awb = await shiprocketService.generateAWB(created.shipment_id);
      const data = awb.response?.data;
      if (data?.awb_code) {
        await query('UPDATE orders SET awb_code = $1, courier = $2, tracking_number = $1 WHERE id = $3', [
          data.awb_code,
          data.courier_name,
          orderId,
        ]);
      }
    } catch (e) {
      logger.warn('AWB generation deferred', e);
    }
  } catch (e) {
    logger.error('Shiprocket fulfilment failed (order still valid)', e);
  }
}

export const paymentController = {
  /** Create a Razorpay order for an existing internal order. */
  async createRazorpayOrder(req: Request, res: Response) {
    const { orderId } = req.body as { orderId: string };
    const order = await queryOne<{ id: string; total: string; order_number: string; payment_method: string; payment_status: string }>(
      'SELECT id, total, order_number, payment_method, payment_status FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, req.user!.sub]
    );
    if (!order) throw ApiError.notFound('Order not found');
    if (order.payment_method !== 'razorpay') throw ApiError.badRequest('Order is not a Razorpay order');
    if (order.payment_status === 'paid') throw ApiError.badRequest('Order already paid');

    const rzpOrder = await razorpayService.createOrder(Number(order.total), order.order_number);
    await query(
      `UPDATE payments SET razorpay_order_id = $1, status = 'created' WHERE order_id = $2`,
      [rzpOrder.id, order.id]
    );
    res.json({
      success: true,
      keyId: razorpayService.keyId(),
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderNumber: order.order_number,
    });
  },

  /** Verify the payment signature from Razorpay Checkout. */
  async verify(req: Request, res: Response) {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    };
    const valid = razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    if (!valid) {
      await query("UPDATE payments SET status = 'failed' WHERE razorpay_order_id = $1", [razorpayOrderId]);
      throw ApiError.badRequest('Payment verification failed');
    }
    await query(
      `UPDATE payments SET status = 'captured', razorpay_payment_id = $1, razorpay_signature = $2
       WHERE order_id = $3`,
      [razorpayPaymentId, razorpaySignature, orderId]
    );
    const order = await queryOne<{ order_number: string; email: string; total: string }>(
      `UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = $1 AND user_id = $2
       RETURNING order_number, email, total`,
      [orderId, req.user!.sub]
    );
    if (!order) throw ApiError.notFound('Order not found');

    const items = await query<{ name: string; quantity: number; total: string }>(
      'SELECT name, quantity, total FROM order_items WHERE order_id = $1',
      [orderId]
    );
    const user = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [req.user!.sub]);
    await emailService.sendOrderConfirmation(order.email, user?.name ?? 'Customer', {
      order_number: order.order_number,
      total: Number(order.total),
      items: items.rows.map((i) => ({ name: i.name, quantity: i.quantity, total: Number(i.total) })),
      trackUrl: `${env.clientUrl}/track/${order.order_number}`,
    });

    await fulfilWithShiprocket(orderId);
    res.json({ success: true, message: 'Payment verified', orderNumber: order.order_number });
  },

  /** Razorpay server-to-server webhook (configure RAZORPAY_WEBHOOK_SECRET). */
  async webhook(req: Request, res: Response) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    if (!signature || !razorpayService.verifyWebhookSignature(rawBody, signature)) {
      throw ApiError.unauthorized('Invalid webhook signature');
    }
    const event = req.body?.event as string;
    const entity = req.body?.payload?.payment?.entity;
    if (event === 'payment.captured' && entity?.order_id) {
      const payment = await queryOne<{ order_id: string }>(
        'SELECT order_id FROM payments WHERE razorpay_order_id = $1',
        [entity.order_id]
      );
      if (payment) {
        await query("UPDATE payments SET status = 'captured', razorpay_payment_id = $1 WHERE razorpay_order_id = $2", [
          entity.id,
          entity.order_id,
        ]);
        await query("UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = $1", [
          payment.order_id,
        ]);
      }
    }
    res.json({ success: true });
  },
};
