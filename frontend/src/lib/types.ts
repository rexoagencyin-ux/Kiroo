export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'customer' | 'admin';
  provider: string;
  is_verified: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  product_count?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_desc: string | null;
  brand: string | null;
  category_id: string | null;
  category_name?: string;
  category_slug?: string;
  price: number;
  compare_price: number | null;
  flash_price: number | null;
  effective_price?: number;
  sku: string | null;
  stock: number;
  low_stock_threshold?: number;
  images: string[];
  specifications: Record<string, string>;
  variants: { name: string; options: string[] }[];
  tags: string[];
  rating_avg: number;
  rating_count: number;
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  is_flash_sale: boolean;
  flash_ends_at: string | null;
  sold_count: number;
  meta_title?: string | null;
  meta_description?: string | null;
  is_active?: boolean;
}

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  image: string | null;
  variant: string | null;
  price: number;
  quantity: number;
  stock: number;
  lineTotal: number;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
}

export interface Address {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface OrderItem {
  id?: string;
  product_id?: string;
  name: string;
  image_url: string | null;
  variant?: string | null;
  unit_price?: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: 'razorpay' | 'cod';
  payment_status: string;
  subtotal: number;
  discount: number;
  tax: number;
  shipping_fee: number;
  total: number;
  coupon_code: string | null;
  shipping_address: Address;
  tracking_number: string | null;
  courier: string | null;
  created_at: string;
  delivered_at: string | null;
  items: OrderItem[];
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified: boolean;
  created_at: string;
  user_name: string;
  status?: string;
}

export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  cta_label: string | null;
  position: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
