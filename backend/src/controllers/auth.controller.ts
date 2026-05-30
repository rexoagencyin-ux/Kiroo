import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { query, queryOne } from '../db/pool';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { comparePassword, createToken, hashPassword, hashToken } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtPayload } from '../utils/jwt';
import { emailService } from '../services/email.service';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'customer' | 'admin';
  provider: string;
  is_verified: boolean;
  password_hash: string | null;
  refresh_token: string | null;
  created_at: string;
}

const googleClient = new OAuth2Client(env.google.clientId);

function sanitize(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatar_url: u.avatar_url,
    role: u.role,
    provider: u.provider,
    is_verified: u.is_verified,
    created_at: u.created_at,
  };
}

function setAuthCookies(res: Response, access: string, refresh: string) {
  const secure = env.isProd;
  res.cookie('access_token', access, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refresh, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

async function issueTokens(res: Response, user: UserRow) {
  const payload: JwtPayload = { sub: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await query('UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE id = $2', [
    refreshToken,
    user.id,
  ]);
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

export const authController = {
  async register(req: Request, res: Response) {
    const { name, email, phone, password } = req.body as {
      name: string;
      email: string;
      phone?: string;
      password: string;
    };
    const existing = await queryOne<UserRow>('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const passwordHash = await hashPassword(password);
    const { token: verifyToken, hash: verifyHash } = createToken();
    const user = await queryOne<UserRow>(
      `INSERT INTO users (name, email, phone, password_hash, verify_token, provider)
       VALUES ($1,$2,$3,$4,$5,'email') RETURNING *`,
      [name, email, phone ?? null, passwordHash, verifyHash]
    );
    if (!user) throw ApiError.internal('Failed to create account');

    const verifyUrl = `${env.clientUrl}/verify-email?token=${verifyToken}`;
    await emailService.sendWelcome(email, name, verifyUrl);

    const tokens = await issueTokens(res, user);
    res.status(201).json({ success: true, user: sanitize(user), ...tokens });
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body as { email: string; password: string };
    const user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !user.password_hash) throw ApiError.unauthorized('Invalid email or password');
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) throw ApiError.unauthorized('Invalid email or password');

    const tokens = await issueTokens(res, user);
    res.json({ success: true, user: sanitize(user), ...tokens });
  },

  async google(req: Request, res: Response) {
    const { idToken } = req.body as { idToken: string };
    if (!env.google.clientId) throw ApiError.internal('Google login is not configured');
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.google.clientId });
    const payload = ticket.getPayload();
    if (!payload?.email) throw ApiError.unauthorized('Google authentication failed');

    let user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [payload.email]);
    if (!user) {
      user = await queryOne<UserRow>(
        `INSERT INTO users (name, email, avatar_url, provider, google_id, is_verified)
         VALUES ($1,$2,$3,'google',$4,TRUE) RETURNING *`,
        [payload.name ?? 'Customer', payload.email, payload.picture ?? null, payload.sub]
      );
      if (user) await emailService.sendWelcome(user.email, user.name);
    } else if (!user.is_verified) {
      await query('UPDATE users SET is_verified = TRUE, google_id = $1 WHERE id = $2', [
        payload.sub,
        user.id,
      ]);
    }
    if (!user) throw ApiError.internal('Failed to sign in with Google');

    const tokens = await issueTokens(res, user);
    res.json({ success: true, user: sanitize(user), ...tokens });
  },

  async refresh(req: Request, res: Response) {
    const token = (req.cookies?.refresh_token as string) ?? (req.body?.refreshToken as string);
    if (!token) throw ApiError.unauthorized('No refresh token');
    let decoded: JwtPayload;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [decoded.sub]);
    if (!user || user.refresh_token !== token) throw ApiError.unauthorized('Session expired');
    const tokens = await issueTokens(res, user);
    res.json({ success: true, user: sanitize(user), ...tokens });
  },

  async logout(req: Request, res: Response) {
    if (req.user) {
      await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.sub]);
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ success: true, message: 'Logged out' });
  },

  async me(req: Request, res: Response) {
    const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.sub]);
    if (!user) throw ApiError.notFound('User not found');
    res.json({ success: true, user: sanitize(user) });
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body as { email: string };
    const user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    // Always respond success to avoid user enumeration.
    if (user) {
      const { token, hash } = createToken();
      await query(
        "UPDATE users SET reset_token = $1, reset_expires = NOW() + INTERVAL '30 minutes' WHERE id = $2",
        [hash, user.id]
      );
      const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
      await emailService.sendPasswordReset(user.email, user.name, resetUrl);
    }
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body as { token: string; password: string };
    const hash = hashToken(token);
    const user = await queryOne<UserRow>(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [hash]
    );
    if (!user) throw ApiError.badRequest('Invalid or expired reset token');
    const passwordHash = await hashPassword(password);
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL, refresh_token = NULL WHERE id = $2',
      [passwordHash, user.id]
    );
    res.json({ success: true, message: 'Password updated. Please log in.' });
  },

  async verifyEmail(req: Request, res: Response) {
    const token = (req.query.token as string) ?? (req.body?.token as string);
    if (!token) throw ApiError.badRequest('Missing token');
    const hash = hashToken(token);
    const user = await queryOne<UserRow>('SELECT * FROM users WHERE verify_token = $1', [hash]);
    if (!user) throw ApiError.badRequest('Invalid verification token');
    await query('UPDATE users SET is_verified = TRUE, verify_token = NULL WHERE id = $1', [user.id]);
    res.json({ success: true, message: 'Email verified' });
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.sub]);
    if (!user) throw ApiError.notFound('User not found');
    if (!user.password_hash) throw ApiError.badRequest('Set a password via reset flow first');
    const ok = await comparePassword(currentPassword, user.password_hash);
    if (!ok) throw ApiError.badRequest('Current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
    res.json({ success: true, message: 'Password changed' });
  },

  async updateProfile(req: Request, res: Response) {
    const { name, phone, avatar_url } = req.body as {
      name?: string;
      phone?: string;
      avatar_url?: string;
    };
    const user = await queryOne<UserRow>(
      `UPDATE users SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4 RETURNING *`,
      [name ?? null, phone ?? null, avatar_url ?? null, req.user!.sub]
    );
    if (!user) throw ApiError.notFound('User not found');
    res.json({ success: true, user: sanitize(user) });
  },
};
