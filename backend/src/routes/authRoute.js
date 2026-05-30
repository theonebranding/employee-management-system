import express from 'express';
import {
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyOtp,
} from '../controllers/authController.js';
import verifyToken from '../middleware/verifyToken.js';
import validateZod from '../middleware/validateZod.js';
import { strictAuthLimiter } from '../middleware/security.js';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from '../validations/authValidation.js';

const router = express.Router();

router.post('/login', strictAuthLimiter, validateZod(loginSchema), login);

router.post('/forgot-password', strictAuthLimiter, validateZod(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', strictAuthLimiter, validateZod(verifyOtpSchema), verifyOtp);
router.post('/reset-password', strictAuthLimiter, validateZod(resetPasswordSchema), resetPassword);

router.post('/refresh-token', strictAuthLimiter, refreshAccessToken);
router.post('/logout', verifyToken, logout);

export default router;
