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
import checkRole from '../middleware/checkRole.js';
import validateZod from '../middleware/validateZod.js';
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
  checkRole(['employee']),
  validateZod(createDailyReportSchema),
  createDailyReport
);
router.patch(
  '/:reportId?',
  verifyToken,
  checkRole(['employee']),
  validateZod(reportIdParamSchema, 'params'),
  validateZod(updateOwnDailyReportSchema),
  updateOwnDailyReport
);
router.delete(
  '/:reportId?',
  verifyToken,
  checkRole(['employee']),
  validateZod(reportIdParamSchema, 'params'),
  deleteOwnDailyReport
);

router.get(
  '/',
  verifyToken,
  checkRole(['admin']),
  validateZod(listDailyReportsQuerySchema, 'query'),
  listDailyReports
);
router.patch(
  '/admin/:reportId',
  verifyToken,
  checkRole(['admin']),
  validateZod(requiredReportIdParamSchema, 'params'),
  validateZod(updateDailyReportByAdminSchema),
  updateDailyReportByAdmin
);
router.get(
  '/employee/:employeeId',
  verifyToken,
  checkRole(['admin', 'employee']),
  validateZod(employeeIdParamSchema, 'params'),
  validateZod(listEmployeeReportsQuerySchema, 'query'),
  getReportsByEmployee
);

export default router;
