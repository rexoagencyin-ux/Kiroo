import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey) {
    throw ApiError.internal('Cloudinary is not configured');
  }
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
  configured = true;
}

export const cloudinaryService = {
  /** Upload a file buffer to Cloudinary and return the secure URL + public id. */
  uploadBuffer(buffer: Buffer, folder = env.cloudinary.folder): Promise<{ url: string; publicId: string }> {
    ensureConfigured();
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(buffer);
    });
  },

  async destroy(publicId: string): Promise<void> {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId);
  },
};
