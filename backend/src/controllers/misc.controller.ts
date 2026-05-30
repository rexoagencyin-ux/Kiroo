import { Request, Response } from 'express';
import { query } from '../db/pool';
import { ApiError } from '../utils/ApiError';

export const miscController = {
  async subscribeNewsletter(req: Request, res: Response) {
    const { email } = req.body as { email: string };
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw ApiError.badRequest('Valid email required');
    await query(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET is_active = TRUE`,
      [email.toLowerCase()]
    );
    res.status(201).json({ success: true, message: 'Subscribed to newsletter' });
  },

  async listNotifications(req: Request, res: Response) {
    const rows = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user!.sub]
    );
    const unread = await query<{ c: number }>(
      'SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user!.sub]
    );
    res.json({ success: true, data: rows.rows, unread: unread.rows[0]?.c ?? 0 });
  },

  async markNotificationRead(req: Request, res: Response) {
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user!.sub,
    ]);
    res.json({ success: true });
  },

  async markAllNotificationsRead(req: Request, res: Response) {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user!.sub]);
    res.json({ success: true });
  },
};
