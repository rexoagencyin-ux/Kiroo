import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function bool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num('PORT', 5000),
  apiUrl: process.env.API_URL ?? 'http://localhost:5000',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  db: {
    connectionString: process.env.DATABASE_URL,
    ssl: bool('PGSSL', false),
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: num('SMTP_PORT', 587),
    secure: bool('SMTP_SECURE', false),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'Modern Shop <no-reply@modernshop.com>',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'modern-shop',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },

  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL ?? '',
    password: process.env.SHIPROCKET_PASSWORD ?? '',
    pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary',
  },

  store: {
    name: process.env.STORE_NAME ?? 'Modern Shop',
    taxRate: num('TAX_RATE', 0.18),
    freeShippingThreshold: num('FREE_SHIPPING_THRESHOLD', 999),
    defaultShippingFee: num('DEFAULT_SHIPPING_FEE', 49),
    currency: process.env.CURRENCY ?? 'INR',
  },

  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@modernshop.com',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@12345',
  },

  rateLimit: {
    windowMs: num('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: num('RATE_LIMIT_MAX', 300),
  },
};

export type Env = typeof env;
