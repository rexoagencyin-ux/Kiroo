import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';

let client: Razorpay | null = null;

function getClient(): Razorpay {
  if (client) return client;
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw ApiError.internal('Razorpay is not configured');
  }
  client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  return client;
}

export const razorpayService = {
  /** Create a Razorpay order. Amount is in rupees (converted to paise here). */
  async createOrder(amountInRupees: number, receipt: string) {
    const rzp = getClient();
    const order = await rzp.orders.create({
      amount: Math.round(amountInRupees * 100),
      currency: env.store.currency,
      receipt,
      payment_capture: true,
    });
    return order;
  },

  /** Verify the signature returned by Razorpay Checkout. */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  },

  /** Verify a webhook payload signature. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!env.razorpay.webhookSecret) {
      logger.warn('Razorpay webhook secret not set — rejecting webhook');
      return false;
    }
    const expected = crypto
      .createHmac('sha256', env.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  },

  keyId() {
    return env.razorpay.keyId;
  },
};
