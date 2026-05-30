import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';
import {
  changePasswordSchema,
  forgotSchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetSchema,
  updateProfileSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/google', authLimiter, validate(googleSchema), asyncHandler(authController.google));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/forgot-password', authLimiter, validate(forgotSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', authLimiter, validate(resetSchema), asyncHandler(authController.resetPassword));
router.get('/verify-email', asyncHandler(authController.verifyEmail));
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));
router.patch('/profile', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));

export default router;
