-- =====================================================================
-- Modern Shop - PostgreSQL schema
-- Idempotent: safe to run multiple times.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- updated_at trigger helper -------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- USERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  phone           VARCHAR(20),
  password_hash   VARCHAR(255),
  avatar_url      TEXT,
  role            VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  provider        VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (provider IN ('email','google')),
  google_id       VARCHAR(255),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  reset_token     VARCHAR(255),
  reset_expires   TIMESTAMPTZ,
  verify_token    VARCHAR(255),
  refresh_token   VARCHAR(512),
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- CATEGORIES
-- =====================================================================
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(140) NOT NULL UNIQUE,
  description   TEXT,
  image_url     TEXT,
  parent_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- PRODUCTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(220) NOT NULL UNIQUE,
  description     TEXT,
  short_desc      VARCHAR(400),
  brand           VARCHAR(120),
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_price   NUMERIC(12,2) CHECK (compare_price >= 0),
  cost_price      NUMERIC(12,2),
  sku             VARCHAR(80) UNIQUE,
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  images          JSONB NOT NULL DEFAULT '[]'::jsonb,
  specifications  JSONB NOT NULL DEFAULT '{}'::jsonb,
  variants        JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  rating_avg      NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  is_trending     BOOLEAN NOT NULL DEFAULT FALSE,
  is_new_arrival  BOOLEAN NOT NULL DEFAULT FALSE,
  is_flash_sale   BOOLEAN NOT NULL DEFAULT FALSE,
  flash_price     NUMERIC(12,2),
  flash_ends_at   TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  meta_title      VARCHAR(200),
  meta_description VARCHAR(400),
  sold_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_flags ON products(is_featured, is_trending, is_new_arrival, is_flash_sale);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(brand,'')));
DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ADDRESSES
-- =====================================================================
CREATE TABLE IF NOT EXISTS addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     VARCHAR(120) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  line1         VARCHAR(200) NOT NULL,
  line2         VARCHAR(200),
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  postal_code   VARCHAR(20) NOT NULL,
  country       VARCHAR(100) NOT NULL DEFAULT 'India',
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
DROP TRIGGER IF EXISTS trg_addresses_updated ON addresses;
CREATE TRIGGER trg_addresses_updated BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- COUPONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(40) NOT NULL UNIQUE,
  description     TEXT,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('percentage','fixed')),
  value           NUMERIC(12,2) NOT NULL CHECK (value >= 0),
  min_order       NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_discount    NUMERIC(12,2),
  usage_limit     INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  per_user_limit  INTEGER NOT NULL DEFAULT 1,
  starts_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
DROP TRIGGER IF EXISTS trg_coupons_updated ON coupons;
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ORDERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      VARCHAR(30) NOT NULL UNIQUE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  email             VARCHAR(160) NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','returned')),
  payment_method    VARCHAR(20) NOT NULL CHECK (payment_method IN ('razorpay','cod')),
  payment_status    VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending','paid','failed','refunded')),
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax               NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_fee      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  coupon_code       VARCHAR(40),
  shipping_address  JSONB NOT NULL,
  notes             TEXT,
  tracking_number   VARCHAR(120),
  courier           VARCHAR(120),
  shiprocket_order_id VARCHAR(120),
  shiprocket_shipment_id VARCHAR(120),
  awb_code          VARCHAR(120),
  placed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ORDER ITEMS
-- =====================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  name          VARCHAR(200) NOT NULL,
  image_url     TEXT,
  variant       VARCHAR(120),
  unit_price    NUMERIC(12,2) NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  total         NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- =====================================================================
-- PAYMENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider            VARCHAR(20) NOT NULL DEFAULT 'razorpay',
  razorpay_order_id   VARCHAR(120),
  razorpay_payment_id VARCHAR(120),
  razorpay_signature  VARCHAR(255),
  amount              NUMERIC(12,2) NOT NULL,
  currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
  status              VARCHAR(20) NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created','authorized','captured','failed','refunded')),
  raw                 JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_rzp_order ON payments(razorpay_order_id);
DROP TRIGGER IF EXISTS trg_payments_updated ON payments;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- REVIEWS
-- =====================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title             VARCHAR(160),
  comment           TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
DROP TRIGGER IF EXISTS trg_reviews_updated ON reviews;
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- WISHLISTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

-- =====================================================================
-- CART ITEMS (persistent server-side cart)
-- =====================================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant       VARCHAR(120),
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id, variant)
);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
DROP TRIGGER IF EXISTS trg_cart_updated ON cart_items;
CREATE TRIGGER trg_cart_updated BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- BANNERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS banners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(160),
  subtitle      VARCHAR(255),
  image_url     TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url      TEXT,
  cta_label     VARCHAR(80),
  position      VARCHAR(30) NOT NULL DEFAULT 'hero'
                  CHECK (position IN ('hero','promo','sidebar')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_banners_updated ON banners;
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- COUPON REDEMPTIONS (track per-user usage)
-- =====================================================================
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id     UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_coupon_user ON coupon_redemptions(coupon_id, user_id);

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(40) NOT NULL DEFAULT 'general',
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  link          TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- =====================================================================
-- NEWSLETTER SUBSCRIBERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(160) NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- SEARCH HISTORY
-- =====================================================================
CREATE TABLE IF NOT EXISTS search_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  term          VARCHAR(200) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
