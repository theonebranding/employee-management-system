import express from 'express';
import {
  createDailyReport,
  deleteOwnDailyReport,
  getReportsByEmployee,
  listDailyReports,
  updateDailyReportByAdmin,
  updateOwnDailyReport,
} from '../controllers/dailyReportController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import auditLog from '../middleware/auditLog.js';
import validateZod from '../middleware/validateZod.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  createDailyReportSchema,
  employeeIdParamSchema,
  listDailyReportsQuerySchema,
  listEmployeeReportsQuerySchema,
  reportIdParamSchema,
  requiredReportIdParamSchema,
  updateDailyReportByAdminSchema,
  updateOwnDailyReportSchema,
} from '../validations/dailyReportValidation.js';

const router = express.Router();

router.post(
  '/',
  verifyToken,
  checkPermission(PERMISSIONS.DAILY_REPORT_SELF_CREATE),
  auditLog({ action: 'create', resource: 'daily-report', bodyKeys: ['reportText'] }),
  validateZod(createDailyReportSchema),
  createDailyReport
);
router.patch(
  '/:reportId?',
  verifyToken,
  checkPermission(PERMISSIONS.DAILY_REPORT_SELF_UPDATE),
  auditLog({ action: 'update', resource: 'daily-report', bodyKeys: ['reportText'] }),
  validateZod(reportIdParamSchema, 'params'),
  validateZod(updateOwnDailyReportSchema),
  updateOwnDailyReport
);
router.delete(
  '/:reportId?',
  verifyToken,
  checkPermission(PERMISSIONS.DAILY_REPORT_SELF_DELETE),
  auditLog({ action: 'delete', resource: 'daily-report' }),
  validateZod(reportIdParamSchema, 'params'),
  deleteOwnDailyReport
);

router.get(
  '/',
  verifyToken,
  checkPermission(PERMISSIONS.DAILY_REPORT_TEAM_READ),
  validateZod(listDailyReportsQuerySchema, 'query'),
  listDailyReports
);
router.patch(
  '/admin/:reportId',
  verifyToken,
  checkPermission(PERMISSIONS.DAILY_REPORT_TEAM_UPDATE),
  auditLog({ action: 'update', resource: 'daily-report-admin' }),
  validateZod(requiredReportIdParamSchema, 'params'),
  validateZod(updateDailyReportByAdminSchema),
  updateDailyReportByAdmin
);
router.get(
  '/employee/:employeeId',
  verifyToken,
  checkPermission([
    PERMISSIONS.DAILY_REPORT_SELF_READ,
    PERMISSIONS.DAILY_REPORT_TEAM_READ,
  ]),
  validateZod(employeeIdParamSchema, 'params'),
  validateZod(listEmployeeReportsQuerySchema, 'query'),
  getReportsByEmployee
);

export default router;
