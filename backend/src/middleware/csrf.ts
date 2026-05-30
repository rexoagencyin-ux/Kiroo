import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const CSRF_COOKIE = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit-cookie CSRF protection.
 *
 * - Requests authenticated purely via the `Authorization: Bearer` header are NOT
 *   vulnerable to CSRF (a malicious site cannot set that header), so they are skipped.
 * - Requests relying on the auth cookie must send a matching `X-CSRF-Token` header
 *   that equals the `csrf_token` cookie.
 * - Webhooks are skipped (verified via provider signatures instead).
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.path.includes('/payments/webhook')) return next();

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'] as string | undefined;
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(ApiError.forbidden('Invalid or missing CSRF token'));
  }
  next();
}

/** Issue a CSRF token (sets cookie + returns token for the client to echo). */
export function issueCsrfToken(req: Request, res: Response) {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by the client to echo into the header
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ success: true, csrfToken: token });
}
