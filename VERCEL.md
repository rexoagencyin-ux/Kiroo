# Deploying Modern Shop on Vercel

This is a monorepo with two apps. Deploy them as **two separate Vercel projects** from the same GitHub repo, each with a different **Root Directory**.

```
Kiroo/
├── frontend/   → Vercel project #1 (Next.js)   Root Directory = frontend
└── backend/    → Vercel project #2 (Express)   Root Directory = backend
```

You also need a **PostgreSQL database that allows pooled connections** (serverless-friendly), e.g. **Neon** or **Supabase**. Use the *pooled* connection string.

---

## Step 0 — Database

1. Create a Postgres DB (Neon/Supabase recommended for serverless).
2. From your machine, run migrations + seed against it once:
   ```bash
   cd backend
   cp .env.example .env
   # set DATABASE_URL to the (direct, non-pooled) connection string + PGSSL=true
   npm install
   npm run db:migrate
   npm run db:seed
   ```
   Seeded admin: `admin@modernshop.com` / `Admin@12345` — change it.

---

## Step 1 — Backend project (Express API)

1. **New Project** in Vercel → import the repo → set **Root Directory = `backend`**.
2. Vercel detects `backend/vercel.json` (already added) which routes every request to `api/index.ts` (the Express app exported as a serverless function).
3. Add Environment Variables (Production):

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | **pooled** Postgres URL |
   | `PGSSL` | `true` |
   | `PG_POOL_MAX` | `3` |
   | `JWT_ACCESS_SECRET` | long random string |
   | `JWT_REFRESH_SECRET` | long random string |
   | `API_URL` | `https://<backend>.vercel.app` |
   | `CLIENT_URL` | `https://<frontend>.vercel.app` |
   | `CORS_ORIGINS` | `https://<frontend>.vercel.app` |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from Cloudinary |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | from Razorpay |
   | `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` / `SHIPROCKET_PICKUP_LOCATION` | from Shiprocket |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | your SMTP |
   | `GOOGLE_CLIENT_ID` | Google OAuth client id |
   | `TAX_RATE` / `FREE_SHIPPING_THRESHOLD` / `DEFAULT_SHIPPING_FEE` / `CURRENCY` | store config |

4. Deploy. Health check: `https://<backend>.vercel.app/api/health`.
5. **Razorpay webhook:** point it to `https://<backend>.vercel.app/api/payments/webhook` and set `RAZORPAY_WEBHOOK_SECRET`.

> Serverless notes: each request runs in a short-lived function. We keep the PG pool small (`PG_POOL_MAX=3`) and recommend a pooled DB. In-memory rate limiting is per-instance (fine for typical traffic; use a Redis store if you need global limits).

---

## Step 2 — Frontend project (Next.js)

1. **New Project** in Vercel → import the same repo → set **Root Directory = `frontend`**.
2. Vercel auto-detects Next.js (`frontend/vercel.json` is included).
3. Add Environment Variables (Production):

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://<backend>.vercel.app` |
   | `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key id (public) |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client id (public) |
   | `NEXT_PUBLIC_SITE_URL` | `https://<frontend>.vercel.app` |

4. Deploy. Visit the site; admin panel is at `/admin`.

---

## Step 3 — Final wiring

- Make sure **`CORS_ORIGINS`** (backend) exactly equals your frontend origin — cookies use `SameSite=None; Secure` in production, so the domains must be correct and HTTPS (Vercel provides HTTPS).
- In the **Google Cloud Console**, add `https://<frontend>.vercel.app` to *Authorized JavaScript origins* for the OAuth client.
- In **Cloudinary/Razorpay/Shiprocket**, use live keys to enable those features.

## Single-domain option (optional)

If you prefer one domain, deploy only the frontend on Vercel and host the backend elsewhere (Render/Railway/Fly), then set `NEXT_PUBLIC_API_URL` to that backend URL. The frontend already proxies `/sitemap.xml` and `/robots.txt` to the API via `next.config.mjs`.
