import express from 'express';
import {
  register,
  login,
  confirmRegistration,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyOtp,
} from '../controllers/authController.js';
import verifyToken from '../middleware/verifyToken.js';
import validateZod from '../middleware/validateZod.js';
import { authLimiter, strictAuthLimiter } from '../middleware/security.js';
import {
  confirmRegistrationSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from '../validations/authValidation.js';

const router = express.Router();

router.post('/register', authLimiter, validateZod(registerSchema), register);
router.post(
  '/confirm-registration',
  strictAuthLimiter,
  validateZod(confirmRegistrationSchema),
  confirmRegistration
);
router.post('/login', strictAuthLimiter, validateZod(loginSchema), login);

router.post('/forgot-password', strictAuthLimiter, validateZod(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', strictAuthLimiter, validateZod(verifyOtpSchema), verifyOtp);
router.post('/reset-password', strictAuthLimiter, validateZod(resetPasswordSchema), resetPassword);

router.post('/refresh-token', strictAuthLimiter, refreshAccessToken);
router.post('/logout', verifyToken, logout);

export default router;
