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
  verifyMfaLogin,
  updateMfaPreference,
} from '../controllers/authController.js';
import verifyToken from '../middleware/verifyToken.js';
import validateZod from '../middleware/validateZod.js';
import {
  authBurstLimiter,
  authLimiter,
  createCookieOriginGuard,
  strictAuthLimiter,
} from '../middleware/security.js';
import botProtection from '../middleware/botProtection.js';
import captchaProtection from '../middleware/captchaProtection.js';
import checkPermission from '../middleware/checkPermission.js';
import noStore from '../middleware/noStore.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  confirmRegistrationSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateMfaPreferenceSchema,
  verifyMfaSchema,
  verifyOtpSchema,
} from '../validations/authValidation.js';

const router = express.Router();
const authBotProtection = botProtection();
const authCaptchaProtection = captchaProtection();
const strictCookieOriginGuard = createCookieOriginGuard({ allowNoOrigin: false });

router.use(noStore);

router.post(
  '/register',
  authLimiter,
  authBotProtection,
  authCaptchaProtection,
  validateZod(registerSchema),
  register
);
router.post(
  '/confirm-registration',
  strictAuthLimiter,
  authBotProtection,
  authCaptchaProtection,
  validateZod(confirmRegistrationSchema),
  confirmRegistration
);
router.post(
  '/login',
  authBurstLimiter,
  strictAuthLimiter,
  authBotProtection,
  authCaptchaProtection,
  validateZod(loginSchema),
  login
);

router.post(
  '/forgot-password',
  strictAuthLimiter,
  authBotProtection,
  authCaptchaProtection,
  validateZod(forgotPasswordSchema),
  forgotPassword
);
router.post(
  '/verify-otp',
  authBurstLimiter,
  strictAuthLimiter,
  authBotProtection,
  authCaptchaProtection,
  validateZod(verifyOtpSchema),
  verifyOtp
);
router.post(
  '/verify-mfa',
  authBurstLimiter,
  strictAuthLimiter,
  authBotProtection,
  authCaptchaProtection,
  validateZod(verifyMfaSchema),
  verifyMfaLogin
);
router.post(
  '/reset-password',
  authBurstLimiter,
  strictAuthLimiter,
  authBotProtection,
  authCaptchaProtection,
  validateZod(resetPasswordSchema),
  resetPassword
);

router.post('/refresh-token', strictAuthLimiter, strictCookieOriginGuard, refreshAccessToken);
router.post('/logout', verifyToken, logout);
router.patch(
  '/mfa-preference',
  verifyToken,
  checkPermission(PERMISSIONS.SECURITY_MFA_MANAGE),
  validateZod(updateMfaPreferenceSchema),
  updateMfaPreference
);

export default router;
