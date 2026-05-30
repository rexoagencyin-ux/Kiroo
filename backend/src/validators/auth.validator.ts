import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password too long');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email().toLowerCase(),
    phone: z.string().min(7).max(20).optional(),
    password,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),
});

export const googleSchema = z.object({
  body: z.object({
    idToken: z.string().min(10),
  }),
});

export const forgotSchema = z.object({
  body: z.object({ email: z.string().email().toLowerCase() }),
});

export const resetSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: password,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().min(7).max(20).optional(),
    avatar_url: z.string().url().optional(),
  }),
});
