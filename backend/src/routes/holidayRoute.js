import express from 'express';
import {
  getPredefinedHolidays,
  selectHolidays,
  getSelectedHolidays,
  addPredefinedHoliday,
  deletePredefinedHoliday,
  deleteCustomHoliday,
  getEmployeeOnHoliday,
  checkHolidayLeaveOverlap,
  exportPredefinedHolidays,
  importPredefinedHolidaysBulk,
  listHolidayLocations,
} from '../controllers/holidayController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import auditLog from '../middleware/auditLog.js';
import { PERMISSIONS } from '../constants/permissions.js';
import validateZod from '../middleware/validateZod.js';
import { bulkOperationLimiter } from '../middleware/security.js';
import {
  addPredefinedHolidaysSchema,
  employeeOnHolidayQuerySchema,
  exportPredefinedHolidaysQuerySchema,
  holidayIdParamSchema,
  importPredefinedHolidaysSchema,
  overlapAnalysisQuerySchema,
  predefinedHolidayQuerySchema,
  selectHolidaysSchema,
  selectedHolidayEmployeeParamSchema,
} from '../validations/holidayValidation.js';

const router = express.Router();

router.post(
  '/add-predefined-holidays',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_CALENDAR_MANAGE),
  bulkOperationLimiter,
  validateZod(addPredefinedHolidaysSchema),
  auditLog({ action: 'create', resource: 'holiday-predefined' }),
  addPredefinedHoliday
); // Add predefined holidays
router.get(
  '/predefined',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_CALENDAR_READ),
  validateZod(predefinedHolidayQuerySchema, 'query'),
  getPredefinedHolidays
); // Fetch predefined holidays
router.get(
  '/locations',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_CALENDAR_READ),
  listHolidayLocations
);
router.get(
  '/predefined/export',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_CALENDAR_READ),
  bulkOperationLimiter,
  validateZod(exportPredefinedHolidaysQuerySchema, 'query'),
  exportPredefinedHolidays
);
router.post(
  '/predefined/import',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_CALENDAR_MANAGE),
  bulkOperationLimiter,
  validateZod(importPredefinedHolidaysSchema),
  auditLog({ action: 'create', resource: 'holiday-predefined-import' }),
  importPredefinedHolidaysBulk
);
router.delete(
  '/delete-predefined-holidays/:holidayId',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_CALENDAR_MANAGE),
  validateZod(holidayIdParamSchema, 'params'),
  auditLog({ action: 'delete', resource: 'holiday-predefined' }),
  deletePredefinedHoliday
); // Delete predefined holiday
router.post(
  '/select',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_SELECTION_MANAGE),
  validateZod(selectHolidaysSchema),
  auditLog({ action: 'update', resource: 'holiday-selection' }),
  selectHolidays
); // Select holidays (max 10 including custom)
router.get(
  '/selected/:id?',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_CALENDAR_READ),
  validateZod(selectedHolidayEmployeeParamSchema, 'params'),
  getSelectedHolidays
); // Fetch selected employee holidays
router.delete(
  '/delete-custom-holidays/:holidayId',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_SELECTION_MANAGE),
  validateZod(holidayIdParamSchema, 'params'),
  auditLog({ action: 'delete', resource: 'holiday-custom' }),
  deleteCustomHoliday
); // Delete custom holiday

router.get(
  '/employee-on-holiday',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_EMPLOYEE_ROSTER_READ),
  validateZod(employeeOnHolidayQuerySchema, 'query'),
  getEmployeeOnHoliday
); // Get employees on holiday

router.get(
  '/overlap-analysis',
  verifyToken,
  checkPermission(PERMISSIONS.HOLIDAY_EMPLOYEE_ROSTER_READ),
  validateZod(overlapAnalysisQuerySchema, 'query'),
  checkHolidayLeaveOverlap
);

export default router;
