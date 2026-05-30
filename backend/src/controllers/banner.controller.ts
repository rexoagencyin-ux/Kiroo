import { Request, Response } from 'express';
import { query } from '../db/pool';

export const bannerController = {
  async list(req: Request, res: Response) {
    const position = req.query.position as string | undefined;
    const params: unknown[] = [];
    let where = 'WHERE is_active = TRUE';
    if (position) {
      params.push(position);
      where += ` AND position = $1`;
    }
    const rows = await query(
      `SELECT * FROM banners ${where} ORDER BY sort_order ASC, created_at DESC`,
      params
    );
    res.json({ success: true, data: rows.rows });
  },
};
