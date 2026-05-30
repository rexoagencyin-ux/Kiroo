import { Request, Response } from 'express';
import { query, queryOne, withTransaction } from '../db/pool';
import { ApiError } from '../utils/ApiError';

export const addressController = {
  async list(req: Request, res: Response) {
    const rows = await query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user!.sub]
    );
    res.json({ success: true, data: rows.rows });
  },

  async create(req: Request, res: Response) {
    const b = req.body as Record<string, string | boolean>;
    const address = await withTransaction(async (client) => {
      if (b.is_default) {
        await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user!.sub]);
      }
      const existing = await client.query('SELECT COUNT(*)::int AS c FROM addresses WHERE user_id = $1', [
        req.user!.sub,
      ]);
      const makeDefault = b.is_default || existing.rows[0].c === 0;
      const r = await client.query(
        `INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, state, postal_code, country, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          req.user!.sub,
          b.full_name,
          b.phone,
          b.line1,
          b.line2 ?? null,
          b.city,
          b.state,
          b.postal_code,
          b.country ?? 'India',
          makeDefault,
        ]
      );
      return r.rows[0];
    });
    res.status(201).json({ success: true, data: address });
  },

  async update(req: Request, res: Response) {
    const b = req.body as Record<string, string | boolean>;
    const owned = await queryOne('SELECT id FROM addresses WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user!.sub,
    ]);
    if (!owned) throw ApiError.notFound('Address not found');
    const address = await withTransaction(async (client) => {
      if (b.is_default) {
        await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user!.sub]);
      }
      const r = await client.query(
        `UPDATE addresses SET
           full_name = COALESCE($1, full_name), phone = COALESCE($2, phone),
           line1 = COALESCE($3, line1), line2 = $4, city = COALESCE($5, city),
           state = COALESCE($6, state), postal_code = COALESCE($7, postal_code),
           country = COALESCE($8, country), is_default = COALESCE($9, is_default)
         WHERE id = $10 AND user_id = $11 RETURNING *`,
        [
          b.full_name ?? null,
          b.phone ?? null,
          b.line1 ?? null,
          b.line2 ?? null,
          b.city ?? null,
          b.state ?? null,
          b.postal_code ?? null,
          b.country ?? null,
          b.is_default ?? null,
          req.params.id,
          req.user!.sub,
        ]
      );
      return r.rows[0];
    });
    res.json({ success: true, data: address });
  },

  async remove(req: Request, res: Response) {
    await query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.sub]);
    res.json({ success: true, message: 'Address removed' });
  },

  async setDefault(req: Request, res: Response) {
    await withTransaction(async (client) => {
      await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user!.sub]);
      await client.query('UPDATE addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user!.sub,
      ]);
    });
    res.json({ success: true, message: 'Default address updated' });
  },
};
