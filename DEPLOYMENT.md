# Deployment Guide — Modern Shop

## Architecture

```
[ Next.js frontend (Vercel) ]  ──HTTPS──►  [ Express API (Render/Railway/VM) ]  ──►  [ PostgreSQL ]
                                                     │
                                   Cloudinary · Razorpay · Shiprocket · SMTP
```

## 1. Database (PostgreSQL)

Provision PostgreSQL 14+ (Neon, Supabase, RDS, Railway, etc.) and grab the connection string.

```bash
# In backend/
export DATABASE_URL=postgresql://user:pass@host:5432/modern_shop
npm install
npm run db:migrate   # creates tables + indexes
npm run db:seed      # categories, products, banners, coupons, admin user
```

Default admin after seed: `admin@modernshop.com` / `Admin@12345` — **change immediately in production.**

## 2. Backend API

Set every variable from [`backend/.env.example`](backend/.env.example). Minimum for production:

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Postgres connection string |
| `PGSSL` | `true` for most managed Postgres |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Long random strings |
| `CLIENT_URL`, `CORS_ORIGINS` | Your deployed frontend URL |
| `CLOUDINARY_*` | Image uploads |
| `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` | Payments |
| `SHIPROCKET_EMAIL/PASSWORD` | Shipping |
| `SMTP_*`, `MAIL_FROM` | Transactional email |
| `GOOGLE_CLIENT_ID` | Google login |

Build & run:

```bash
npm install
npm run build
npm run db:migrate
npm start            # listens on $PORT (default 5000)
```

**Render/Railway:** set the build command to `npm install && npm run build`, the start command to `npm start`, and add all env vars. Run `npm run db:migrate` once (release command / one-off job).

### Webhooks
- Razorpay → `POST https://<api>/api/payments/webhook` with `RAZORPAY_WEBHOOK_SECRET`.

## 3. Frontend (Vercel)

1. Import the `frontend/` directory as a Vercel project (root directory = `frontend`).
2. Environment variables:
   - `NEXT_PUBLIC_API_URL=https://<your-api-domain>`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID=<rzp key id>`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google client id>`
   - `NEXT_PUBLIC_SITE_URL=https://<your-frontend-domain>`
3. Deploy. `sitemap.xml` / `robots.txt` are proxied to the API via `next.config.mjs` rewrites.

## 4. Post-deploy checklist

- [ ] Change the seeded admin password
- [ ] Verify CORS: `CORS_ORIGINS` includes the exact frontend origin
- [ ] Razorpay webhook reachable and secret set
- [ ] Cloudinary upload works from the admin product form
- [ ] Test order: COD + Razorpay test card; confirm emails arrive
- [ ] Confirm Shiprocket credentials + a pickup location named per `SHIPROCKET_PICKUP_LOCATION`

## 5. Security defaults (already enabled)

Helmet headers · CORS allow-list · rate limiting · Zod validation on every route · bcrypt hashing · short-lived JWT access tokens with refresh rotation · double-submit-cookie CSRF for cookie-auth requests.
