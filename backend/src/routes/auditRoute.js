import express from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

router.get('/', verifyToken, checkPermission(PERMISSIONS.AUDIT_LOG_READ), listAuditLogs);

export default router;
