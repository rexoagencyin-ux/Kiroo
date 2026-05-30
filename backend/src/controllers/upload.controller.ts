import { Request, Response } from 'express';
import { cloudinaryService } from '../services/cloudinary.service';
import { ApiError } from '../utils/ApiError';

export const uploadController = {
  async single(req: Request, res: Response) {
    if (!req.file) throw ApiError.badRequest('No file uploaded');
    const result = await cloudinaryService.uploadBuffer(req.file.buffer);
    res.status(201).json({ success: true, url: result.url, publicId: result.publicId });
  },

  async multiple(req: Request, res: Response) {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) throw ApiError.badRequest('No files uploaded');
    const results = await Promise.all(files.map((f) => cloudinaryService.uploadBuffer(f.buffer)));
    res.status(201).json({ success: true, images: results });
  },

  async destroy(req: Request, res: Response) {
    const { publicId } = req.body as { publicId: string };
    if (!publicId) throw ApiError.badRequest('publicId required');
    await cloudinaryService.destroy(publicId);
    res.json({ success: true, message: 'Image deleted' });
  },
};
