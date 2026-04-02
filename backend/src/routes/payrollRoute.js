import express from 'express';
import {
  createPayrollRun,
  decidePayrollRunUnlock,
  getPayrollRunById,
  listPayrollChangeControls,
  listPayrollRuns,
  lockPayrollRun,
  releasePayrollRun,
  requestPayrollRunUnlock,
  validatePayrollRun,
} from '../controllers/payrollController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import auditLog from '../middleware/auditLog.js';
import checkPermission from '../middleware/checkPermission.js';
import validateZod from '../middleware/validateZod.js';
import verifyToken from '../middleware/verifyToken.js';
import {
  createPayrollRunSchema,
  createPayrollUnlockRequestSchema,
  decidePayrollUnlockRequestSchema,
  listPayrollChangeControlsQuerySchema,
  listPayrollRunsQuerySchema,
  payrollRunIdParamSchema,
  payrollUnlockRequestIdParamSchema,
} from '../validations/payrollValidation.js';

const router = express.Router();

router.post(
  '/runs',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_RUN_CREATE),
  validateZod(createPayrollRunSchema),
  auditLog({ action: 'create', resource: 'payroll-run', bodyKeys: ['name', 'month', 'year'] }),
  createPayrollRun
);

router.get(
  '/runs',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_RUN_READ),
  validateZod(listPayrollRunsQuerySchema, 'query'),
  listPayrollRuns
);

router.get(
  '/runs/:runId',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_RUN_READ),
  validateZod(payrollRunIdParamSchema, 'params'),
  getPayrollRunById
);

router.post(
  '/runs/:runId/validate',
  verifyToken,
  checkPermission([PERMISSIONS.PAYROLL_RUN_VALIDATE, PERMISSIONS.PAYROLL_COMPLIANCE_VALIDATE]),
  validateZod(payrollRunIdParamSchema, 'params'),
  auditLog({ action: 'update', resource: 'payroll-run-validate' }),
  validatePayrollRun
);

router.post(
  '/runs/:runId/lock',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_RUN_LOCK),
  validateZod(payrollRunIdParamSchema, 'params'),
  auditLog({ action: 'update', resource: 'payroll-run-lock' }),
  lockPayrollRun
);

router.post(
  '/runs/:runId/release',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_RUN_RELEASE),
  validateZod(payrollRunIdParamSchema, 'params'),
  auditLog({ action: 'update', resource: 'payroll-run-release' }),
  releasePayrollRun
);

router.post(
  '/runs/:runId/unlock-requests',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_RUN_OVERRIDE),
  validateZod(payrollRunIdParamSchema, 'params'),
  validateZod(createPayrollUnlockRequestSchema),
  auditLog({ action: 'create', resource: 'payroll-run-unlock-request', bodyKeys: ['reason'] }),
  requestPayrollRunUnlock
);

router.patch(
  '/unlock-requests/:requestId',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_RUN_OVERRIDE),
  validateZod(payrollUnlockRequestIdParamSchema, 'params'),
  validateZod(decidePayrollUnlockRequestSchema),
  auditLog({ action: 'update', resource: 'payroll-run-unlock-decision', bodyKeys: ['status'] }),
  decidePayrollRunUnlock
);

router.get(
  '/unlock-requests',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_RUN_OVERRIDE),
  validateZod(listPayrollChangeControlsQuerySchema, 'query'),
  listPayrollChangeControls
);

export default router;
