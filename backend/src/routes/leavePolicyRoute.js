import express from 'express';
import {
  adjustLeaveBalance,
  createLeaveType,
  createLeaveEncashment,
  decideLeaveEncashment,
  enqueueAccrualRun,
  listLeaveEncashments,
  listLeaveBalances,
  listLeaveTypes,
  queueYearEndCarryForward,
  runAccrualImmediately,
  runYearEndCarryForwardNow,
  updateLeaveType,
  previewLeave,
  previewEncashment,
} from '../controllers/leavePolicyController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import auditLog from '../middleware/auditLog.js';
import checkPermission from '../middleware/checkPermission.js';
import validateZod from '../middleware/validateZod.js';
import verifyToken from '../middleware/verifyToken.js';
import {
  adjustLeaveBalanceSchema,
  createLeaveEncashmentSchema,
  createLeaveTypeSchema,
  decideLeaveEncashmentSchema,
  encashmentRequestIdParamSchema,
  leaveBalanceQuerySchema,
  leaveTypeCodeParamSchema,
  listLeaveEncashmentQuerySchema,
  runAccrualSchema,
  runYearEndCarryForwardSchema,
  updateLeaveTypeSchema,
  previewLeaveQuerySchema,
  previewEncashmentQuerySchema,
} from '../validations/leavePolicyValidation.js';

const router = express.Router();

router.get('/types', verifyToken, checkPermission(PERMISSIONS.LEAVE_BALANCE_READ), listLeaveTypes);
router.post(
  '/types',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_POLICY_MANAGE),
  validateZod(createLeaveTypeSchema),
  auditLog({ action: 'create', resource: 'leave-type' }),
  createLeaveType
);
router.patch(
  '/types/:code',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_POLICY_MANAGE),
  validateZod(leaveTypeCodeParamSchema, 'params'),
  validateZod(updateLeaveTypeSchema),
  auditLog({ action: 'update', resource: 'leave-type' }),
  updateLeaveType
);

router.get(
  '/balances',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_BALANCE_READ),
  validateZod(leaveBalanceQuerySchema, 'query'),
  listLeaveBalances
);
router.post(
  '/balances/adjust',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_BALANCE_MANAGE),
  validateZod(adjustLeaveBalanceSchema),
  auditLog({ action: 'update', resource: 'leave-balance-adjustment' }),
  adjustLeaveBalance
);

router.post(
  '/accrual/queue',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_ACCRUAL_RUN),
  validateZod(runAccrualSchema),
  auditLog({ action: 'create', resource: 'leave-accrual-queue' }),
  enqueueAccrualRun
);
router.post(
  '/accrual/run-now',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_ACCRUAL_RUN),
  validateZod(runAccrualSchema),
  auditLog({ action: 'create', resource: 'leave-accrual-run' }),
  runAccrualImmediately
);

router.post(
  '/encashments',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_BALANCE_READ),
  validateZod(createLeaveEncashmentSchema),
  auditLog({ action: 'create', resource: 'leave-encashment-request' }),
  createLeaveEncashment
);
router.get(
  '/encashments/quote',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_BALANCE_READ),
  validateZod(previewEncashmentQuerySchema, 'query'),
  previewEncashment
);
router.get(
  '/encashments',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_BALANCE_READ),
  validateZod(listLeaveEncashmentQuerySchema, 'query'),
  listLeaveEncashments
);
router.get(
  '/preview',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_BALANCE_READ),
  validateZod(previewLeaveQuerySchema, 'query'),
  previewLeave
);
router.patch(
  '/encashments/:requestId/decision',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_ENCASHMENT_MANAGE),
  validateZod(encashmentRequestIdParamSchema, 'params'),
  validateZod(decideLeaveEncashmentSchema),
  auditLog({ action: 'update', resource: 'leave-encashment-decision' }),
  decideLeaveEncashment
);

router.post(
  '/carry-forward/queue',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_POLICY_MANAGE),
  validateZod(runYearEndCarryForwardSchema),
  auditLog({ action: 'create', resource: 'leave-carry-forward-queue' }),
  queueYearEndCarryForward
);
router.post(
  '/carry-forward/run-now',
  verifyToken,
  checkPermission(PERMISSIONS.LEAVE_POLICY_MANAGE),
  validateZod(runYearEndCarryForwardSchema),
  auditLog({ action: 'create', resource: 'leave-carry-forward-run' }),
  runYearEndCarryForwardNow
);

export default router;
