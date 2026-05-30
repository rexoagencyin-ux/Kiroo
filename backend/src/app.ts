import express, { Request } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import { csrfProtection, issueCsrfToken } from './middleware/csrf';
import { seoController } from './controllers/seo.controller';
import { asyncHandler } from './utils/asyncHandler';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  // CORS
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || env.corsOrigins.includes(origin) || !env.isProd) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );

  // Body parsing — capture raw body for webhook signature verification.
  app.use(
    express.json({
      limit: '5mb',
      verify: (req: Request & { rawBody?: string }, _res, buf) => {
        if (req.originalUrl.includes('/payments/webhook')) {
          req.rawBody = buf.toString('utf8');
        }
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!env.isProd) app.use(morgan('dev'));

  // Rate limiting (all API routes)
  app.use('/api', apiLimiter);

  // CSRF token issuer + protection
  app.get('/api/csrf-token', issueCsrfToken);
  app.use('/api', csrfProtection);

  // SEO endpoints (served from API; the frontend can proxy/rewrite these)
  app.get('/sitemap.xml', asyncHandler(seoController.sitemap));
  app.get('/robots.txt', seoController.robots);

  // API
  app.use('/api', routes);

  // 404 + error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
