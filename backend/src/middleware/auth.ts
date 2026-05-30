import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.access_token) return req.cookies.access_token as string;
  return null;
}

/** Require a valid access token. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

/** Attach user if a token is present, but don't fail when absent. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      /* ignore — treat as guest */
    }
  }
  next();
}

/** Require the authenticated user to be an admin. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  if (req.user.role !== 'admin') throw ApiError.forbidden('Admin access required');
  next();
}
