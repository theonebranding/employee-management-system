import express from 'express';
import {
  createScheduledReport,
  getExecutiveDrilldowns,
  getExecutiveKpis,
  getExecutiveTrends,
  listScheduledReportRuns,
  listScheduledReports,
  runScheduledReportNow,
  updateScheduledReport,
} from '../controllers/reportingController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import auditLog from '../middleware/auditLog.js';
import checkPermission from '../middleware/checkPermission.js';
import validateZod from '../middleware/validateZod.js';
import verifyToken from '../middleware/verifyToken.js';
import {
  createScheduledReportSchema,
  executiveDrilldownQuerySchema,
  executiveKpiQuerySchema,
  executiveTrendsQuerySchema,
  reportIdParamSchema,
  updateScheduledReportSchema,
} from '../validations/reportingValidation.js';

const router = express.Router();

router.get(
  '/executive-kpis',
  verifyToken,
  checkPermission(PERMISSIONS.REPORTING_KPI_READ),
  validateZod(executiveKpiQuerySchema, 'query'),
  getExecutiveKpis
);

router.get(
  '/drilldowns',
  verifyToken,
  checkPermission(PERMISSIONS.REPORTING_DRILLDOWN_READ),
  validateZod(executiveDrilldownQuerySchema, 'query'),
  getExecutiveDrilldowns
);

router.get(
  '/trends',
  verifyToken,
  checkPermission(PERMISSIONS.REPORTING_KPI_READ),
  validateZod(executiveTrendsQuerySchema, 'query'),
  getExecutiveTrends
);

router.post(
  '/scheduled',
  verifyToken,
  checkPermission(PERMISSIONS.REPORTING_SCHEDULE_MANAGE),
  validateZod(createScheduledReportSchema),
  auditLog({ action: 'create', resource: 'scheduled-report' }),
  createScheduledReport
);

router.get(
  '/scheduled',
  verifyToken,
  checkPermission(PERMISSIONS.REPORTING_SCHEDULE_MANAGE),
  listScheduledReports
);

router.patch(
  '/scheduled/:reportId',
  verifyToken,
  checkPermission(PERMISSIONS.REPORTING_SCHEDULE_MANAGE),
  validateZod(reportIdParamSchema, 'params'),
  validateZod(updateScheduledReportSchema),
  auditLog({ action: 'update', resource: 'scheduled-report' }),
  updateScheduledReport
);

router.post(
  '/scheduled/:reportId/run-now',
  verifyToken,
  checkPermission(PERMISSIONS.REPORTING_SCHEDULE_MANAGE),
  validateZod(reportIdParamSchema, 'params'),
  auditLog({ action: 'create', resource: 'scheduled-report-run' }),
  runScheduledReportNow
);

router.get(
  '/scheduled/:reportId/runs',
  verifyToken,
  checkPermission(PERMISSIONS.REPORTING_SCHEDULE_MANAGE),
  validateZod(reportIdParamSchema, 'params'),
  listScheduledReportRuns
);

export default router;
