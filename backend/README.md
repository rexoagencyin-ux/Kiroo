# Modern Shop — Backend API

Express + TypeScript + PostgreSQL REST API.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start in watch mode (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run db:migrate` | Create tables & indexes |
| `npm run db:seed` | Seed categories, products, banners, coupons, admin |
| `npm run typecheck` | Type-check without emitting |

## Base URL

`/api`

### Auth (`/api/auth`)
| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | – | Create account (sends welcome email) |
| POST | `/login` | – | Email/password login |
| POST | `/google` | – | Google ID-token login |
| POST | `/refresh` | cookie | Rotate access token |
| POST | `/logout` | yes | Invalidate refresh token |
| GET | `/me` | yes | Current user |
| POST | `/forgot-password` | – | Send reset email |
| POST | `/reset-password` | – | Reset with token |
| GET | `/verify-email` | – | Verify email token |
| POST | `/change-password` | yes | Change password |
| PATCH | `/profile` | yes | Update profile |

### Catalog
- `GET /api/products` — filters: `q, category, brand, minPrice, maxPrice, rating, filter(featured|trending|new|flash), sort, page, limit, inStock`
- `GET /api/products/home` — featured / trending / new arrivals / flash sale
- `GET /api/products/brands`
- `GET /api/products/:slug` — detail + related + reviews
- `GET /api/categories`, `GET /api/categories/:slug`
- `GET /api/banners?position=hero|promo`
- `GET /api/search?q=`, `/api/search/trending`, `/api/search/history`

### Cart / Orders / Payments (auth)
- `GET/POST/PATCH/DELETE /api/cart`, `POST /api/cart/merge`
- `POST /api/orders` (cod or razorpay), `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel`
- `GET /api/orders/track/:orderNumber` (public)
- `POST /api/payments/create-order`, `POST /api/payments/verify`, `POST /api/payments/webhook`
- `POST /api/coupons/validate`

### Account (auth)
- `GET/POST/PATCH/DELETE /api/addresses`, `POST /api/addresses/:id/default`
- `GET/POST/DELETE /api/wishlist`, `POST /api/wishlist/move-to-cart`
- `GET /api/reviews/product/:productId`, `POST /api/reviews`, `GET /api/reviews/mine`
- `GET /api/notifications`, mark read endpoints

### Admin (auth + role=admin) — `/api/admin`
- `GET /dashboard`, `GET /analytics?days=30`, `GET /inventory?low=true`
- Products: `GET /products`, `POST /products`, `POST /products/bulk`, `PATCH /products/:id`, `PATCH /products/:id/stock`, `DELETE /products/:id`
- Categories: `POST/PATCH/DELETE /categories`
- Orders: `GET /orders`, `GET /orders/:id`, `GET /orders/:id/invoice`, `PATCH /orders/:id/status`, `POST /orders/:id/ship`
- Customers: `GET /customers`, `GET /customers/:id`, `POST /customers/:id/toggle`
- Coupons: `GET/POST/PATCH/DELETE /coupons`
- Banners: `GET/POST/PATCH/DELETE /banners`
- Reviews: `GET /reviews?status=pending`, `POST /reviews/:id/moderate`
- Uploads: `POST /api/upload` (multipart `image`), `POST /api/upload/multiple`

### SEO
- `GET /sitemap.xml`, `GET /robots.txt`

## Security
Helmet, CORS allow-list, rate limiting, Zod validation, bcrypt hashing, JWT access/refresh with rotation, and double-submit-cookie CSRF for cookie-authenticated requests (`GET /api/csrf-token`).
