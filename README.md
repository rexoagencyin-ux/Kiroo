# Modern Shop — Full-Stack E-commerce Platform

A production-ready, mobile-first e-commerce platform.

- **Frontend:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn-style UI
- **Backend:** Node.js · Express · TypeScript
- **Database:** PostgreSQL
- **Auth:** JWT (access + refresh) · Google OAuth · Email/password · Forgot/Reset password
- **Storage:** Cloudinary
- **Payments:** Razorpay + Cash on Delivery (COD)
- **Shipping:** Shiprocket
- **Email:** Nodemailer (order confirmation, registration, password reset)

> Brand colors — Primary `#4CAF50`, Secondary `#FFFFFF`, Accent `#1E1E1E`.

```
Kiroo/
├── backend/      # Express + TypeScript REST API
├── frontend/     # Next.js 15 storefront + admin panel
└── README.md
```

## 1. Prerequisites

- Node.js 20+ (the repo is developed/tested on Node 22)
- PostgreSQL 14+
- Accounts/keys for: Cloudinary, Razorpay, Shiprocket, an SMTP provider, and a Google OAuth client (optional but recommended)

## 2. Backend setup

```bash
cd backend
cp .env.example .env        # then fill in real values
npm install
npm run db:migrate          # creates all tables + indexes
npm run db:seed             # seeds categories, sample products, and an admin user
npm run dev                 # starts API on http://localhost:5000
```

The seed creates an admin: `admin@modernshop.com` / `Admin@12345` (change it in production).

## 3. Frontend setup

```bash
cd frontend
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL etc.
npm install
npm run dev                 # starts storefront on http://localhost:3000
```

Admin panel is at `http://localhost:3000/admin` (log in with an admin account).

## 4. Environment variables

See [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example). Every integration reads its keys from these files — supply real keys to enable live payments, shipping, email, and uploads.

## 5. Deployment

### Backend (Render / Railway / Fly / a VM)
1. Provision a PostgreSQL database and set `DATABASE_URL`.
2. Set all environment variables from `.env.example`.
3. Build & start:
   ```bash
   npm install && npm run build
   npm run db:migrate
   npm start
   ```
4. Expose port `PORT` (default 5000). Put it behind HTTPS.

### Frontend (Vercel)
1. Import the `frontend/` directory.
2. Set `NEXT_PUBLIC_API_URL` to your deployed API URL and the public keys.
3. Deploy. The App Router build produces a fully SSR/ISR-capable app.

### Webhooks
- **Razorpay:** point the webhook to `POST {API_URL}/api/payments/webhook` and set `RAZORPAY_WEBHOOK_SECRET`.
- **Shiprocket:** tracking is pulled on demand and can also be pushed to `POST {API_URL}/api/shipping/webhook`.

## 6. Security

CSRF protection, configurable rate limiting, Helmet headers, Zod input validation on every route, bcrypt password hashing, and short-lived JWTs with refresh-token rotation are all enabled by default. See `backend/src/middleware`.

## 7. API overview

A full route map lives in [`backend/README.md`](backend/README.md).

