# Modern Shop — Frontend

Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn-style UI.

## Setup

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL etc.
npm install
npm run dev                  # http://localhost:3000
```

Make sure the backend API (see `../backend`) is running and `NEXT_PUBLIC_API_URL` points to it.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run typecheck` | Type-check |

## Routes

### Storefront
- `/` — Home (hero slider, categories, flash sale, featured/trending/new, testimonials)
- `/products` — Listing with filters, sort, grid/list, pagination
- `/product/[slug]` — Detail (gallery + zoom, specs, reviews, related, add/buy/wishlist)
- `/category/[slug]` — Category page
- `/cart` — Cart with coupons & live summary
- `/checkout` — Address, payment (Razorpay/COD), order placement
- `/order-success` — Confirmation
- `/track/[orderNumber]` — Order tracking timeline
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`

### Account (`/profile`)
- Dashboard, Orders, Wishlist, Addresses, Settings (profile + change password)

### Admin (`/admin`, role=admin)
- Dashboard, Products, Categories, Orders, Customers, Coupons, Banners, Reviews, Inventory, Analytics

## Theme

Primary `#4CAF50` · Secondary `#FFFFFF` · Accent `#1E1E1E` (configured in `tailwind.config.ts`).

## Auth

JWT access token kept in `localStorage`, refresh token in an httpOnly cookie. The API client (`src/lib/api.ts`) auto-refreshes on 401. Google login uses `@react-oauth/google`.
