/**
 * Vercel serverless entry point for the Express API.
 *
 * Vercel's @vercel/node runtime treats a default-exported Express app/handler
 * as the request handler. All routes (/api/*, /sitemap.xml, /robots.txt) are
 * served by the same app via the catch-all route in vercel.json.
 *
 * IMPORTANT: Deploy this as a separate Vercel project with Root Directory = "backend".
 *
 * NOTE: migrations/seeds are NOT run here. Run them once against your database:
 *   DATABASE_URL=... npm run db:migrate && npm run db:seed
 */
import { createApp } from '../src/app';

const app = createApp();

// Vercel expects a default export of the handler
export default app;
