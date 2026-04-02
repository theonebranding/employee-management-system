import express from 'express';
import {
  createLeave,
  getAllLeaves,
  updateLeaveStatus,
  getMyLeaves,
  deleteLeave,
} from '../controllers/leaveController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import auditLog from '../middleware/auditLog.js';
import { PERMISSIONS } from '../constants/permissions.js';
import validateZod from '../middleware/validateZod.js';
import {
  createLeaveSchema,
  leaveEmployeeIdParamSchema,
  leaveIdParamSchema,
  updateLeaveStatusSchema,
} from '../validations/leaveValidation.js';

const router = express.Router();

// Employee - Create Leave
router.post(
  '/create',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_REQUEST_CREATE),
  auditLog({ action: 'create', resource: 'leave-request', bodyKeys: ['startDate', 'endDate', 'reason'] }),
  validateZod(createLeaveSchema),
  createLeave
);

// Employee - Get My Leaves
router.get(
  '/employee-leaves/:id?',
  verifyToken,
  checkPermission([PERMISSIONS.LEAVE_SELF_READ, PERMISSIONS.LEAVE_ALL_READ]),
  validateZod(leaveEmployeeIdParamSchema, 'params'),
  getMyLeaves
);

// Admin - View All Leaves
router.get('/', verifyToken, checkPermission(PERMISSIONS.LEAVE_ALL_READ), getAllLeaves);

// Admin - Update Leave Status
router.patch(
  '/update/:leaveId',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_APPROVAL_UPDATE),
  auditLog({ action: 'update', resource: 'leave-approval', bodyKeys: ['status', 'decisionNote'] }),
  validateZod(leaveIdParamSchema, 'params'),
  validateZod(updateLeaveStatusSchema),
  updateLeaveStatus
);

// Admin - Delete Leave
router.delete(
  '/delete/:leaveId',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_DELETE),
  auditLog({ action: 'delete', resource: 'leave-request' }),
  validateZod(leaveIdParamSchema, 'params'),
  deleteLeave
);

export default router;
