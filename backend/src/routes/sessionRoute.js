import express from 'express';
import { listAllSessions, listMySessions, revokeSession } from '../controllers/sessionController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import auditLog from '../middleware/auditLog.js';
import checkPermission from '../middleware/checkPermission.js';
import noStore from '../middleware/noStore.js';
import { sessionMutationLimiter, sessionReadLimiter } from '../middleware/security.js';
import validateZod from '../middleware/validateZod.js';
import verifyToken from '../middleware/verifyToken.js';
import {
  listSessionsQuerySchema,
  revokeSessionParamSchema,
} from '../validations/sessionValidation.js';

const router = express.Router();

router.use(noStore);

router.get(
  '/my',
  verifyToken,
  sessionReadLimiter,
  validateZod(listSessionsQuerySchema, 'query'),
  checkPermission(PERMISSIONS.SECURITY_SESSION_READ),
  listMySessions
);
router.patch(
  '/my/:sessionId/revoke',
  verifyToken,
  sessionMutationLimiter,
  validateZod(revokeSessionParamSchema, 'params'),
  checkPermission(PERMISSIONS.SECURITY_SESSION_REVOKE),
  auditLog({ action: 'update', resource: 'session-revoke-self' }),
  revokeSession
);

router.get(
  '/',
  verifyToken,
  sessionReadLimiter,
  validateZod(listSessionsQuerySchema, 'query'),
  checkPermission(PERMISSIONS.SECURITY_SESSION_READ),
  listAllSessions
);

export default router;
