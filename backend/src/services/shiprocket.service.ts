import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

const BASE = 'https://apiv2.shiprocket.in/v1/external';

let token: string | null = null;
let tokenExpiry = 0;

async function authenticate(): Promise<string> {
  if (token && Date.now() < tokenExpiry) return token;
  if (!env.shiprocket.email || !env.shiprocket.password) {
    throw ApiError.internal('Shiprocket is not configured');
  }
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.shiprocket.email, password: env.shiprocket.password }),
  });
  if (!res.ok) throw ApiError.internal('Shiprocket authentication failed');
  const data = (await res.json()) as { token: string };
  token = data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // tokens last 10 days
  return token;
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const t = await authenticate();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    logger.error('Shiprocket API error', data);
    throw ApiError.badRequest('Shiprocket request failed', data);
  }
  return data as T;
}

export interface ShiprocketOrderPayload {
  order_id: string;
  order_date: string;
  billing_customer_name: string;
  billing_last_name: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  payment_method: 'Prepaid' | 'COD';
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
  order_items: { name: string; sku: string; units: number; selling_price: number }[];
}

export const shiprocketService = {
  /** Create an adhoc order/shipment in Shiprocket. */
  async createOrder(payload: ShiprocketOrderPayload) {
    return request<{ order_id: number; shipment_id: number; status: string }>(
      '/orders/create/adhoc',
      'POST',
      { ...payload, pickup_location: env.shiprocket.pickupLocation, billing_isd_code: '91', shipping_is_billing: true }
    );
  },

  /** Generate an AWB (assign a courier) for a shipment. */
  async generateAWB(shipmentId: number) {
    return request<{ response: { data: { awb_code: string; courier_name: string } } }>(
      '/courier/assign/awb',
      'POST',
      { shipment_id: shipmentId }
    );
  },

  /** Track a shipment by AWB code. */
  async trackByAWB(awb: string) {
    return request<unknown>(`/courier/track/awb/${awb}`, 'GET');
  },

  /** Check serviceability + estimated shipping rate. */
  async checkServiceability(deliveryPincode: string, weight = 0.5, cod = 0) {
    return request<unknown>(
      `/courier/serviceability/?pickup_postcode=110001&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=${cod}`,
      'GET'
    );
  },
};
