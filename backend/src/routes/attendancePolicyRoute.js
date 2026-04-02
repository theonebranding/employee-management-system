import express from 'express';
import {
  assignRota,
  createAttendanceRegularization,
  createShiftTemplate,
  decideAttendanceRegularization,
  listAttendanceRegularizations,
  listRotaAssignments,
  listShiftTemplates,
} from '../controllers/attendancePolicyController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import auditLog from '../middleware/auditLog.js';
import checkPermission from '../middleware/checkPermission.js';
import validateZod from '../middleware/validateZod.js';
import verifyToken from '../middleware/verifyToken.js';
import {
  assignRotaSchema,
  createRegularizationSchema,
  createShiftTemplateSchema,
  decideRegularizationSchema,
  listRegularizationQuerySchema,
  listRotaQuerySchema,
  listShiftTemplatesQuerySchema,
  regularizationIdParamSchema,
} from '../validations/attendancePolicyValidation.js';

const router = express.Router();

router.post(
  '/shifts',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_SHIFT_MANAGE),
  validateZod(createShiftTemplateSchema),
  auditLog({ action: 'create', resource: 'shift-template', bodyKeys: ['name', 'code'] }),
  createShiftTemplate
);

router.get(
  '/shifts',
  verifyToken,
  checkPermission([PERMISSIONS.ATTENDANCE_SHIFT_MANAGE, PERMISSIONS.ATTENDANCE_SUMMARY_READ]),
  validateZod(listShiftTemplatesQuerySchema, 'query'),
  listShiftTemplates
);

router.post(
  '/rota',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_ROTA_MANAGE),
  validateZod(assignRotaSchema),
  auditLog({ action: 'create', resource: 'rota-assignment', bodyKeys: ['employeeId', 'shiftTemplateId'] }),
  assignRota
);

router.get(
  '/rota',
  verifyToken,
  checkPermission([PERMISSIONS.ATTENDANCE_ROTA_MANAGE, PERMISSIONS.ATTENDANCE_SUMMARY_READ]),
  validateZod(listRotaQuerySchema, 'query'),
  listRotaAssignments
);

router.post(
  '/regularizations',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_REGULARIZATION_CREATE),
  validateZod(createRegularizationSchema),
  auditLog({ action: 'create', resource: 'attendance-regularization' }),
  createAttendanceRegularization
);

router.get(
  '/regularizations',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_REGULARIZATION_READ),
  validateZod(listRegularizationQuerySchema, 'query'),
  listAttendanceRegularizations
);

router.patch(
  '/regularizations/:id/decision',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_REGULARIZATION_APPROVE),
  validateZod(regularizationIdParamSchema, 'params'),
  validateZod(decideRegularizationSchema),
  auditLog({ action: 'update', resource: 'attendance-regularization-decision', bodyKeys: ['status'] }),
  decideAttendanceRegularization
);

export default router;
