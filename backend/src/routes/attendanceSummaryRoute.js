import express from 'express';
import {
  getDailyAttendance,
  getMonthlyAttendance,
  getAbsenteeList,
  getPresentList,
  getEmployeeAbsenteeList,
  getEmployeeAbsentDays,
  getEmployeeHalfDays,
  getAverageWorkingHoursByDayOfWeek,
} from '../controllers/attendanceSummaryController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';

const router = express.Router();

router.get('/date', verifyToken, checkRole(['admin']), getDailyAttendance);
router.get('/monthly', verifyToken, checkRole(['admin', 'employee']), getMonthlyAttendance);
router.get('/absentee-list', verifyToken, checkRole(['admin']), getAbsenteeList);
router.get('/present-list', verifyToken, checkRole(['admin']), getPresentList);
router.get('/employee-absentee-list', verifyToken, checkRole(['admin']), getEmployeeAbsenteeList);
// Employee-scoped absent-days lookup used by the history page. Admins may
// pass ?employeeId= to target another employee; everyone else falls back to
// the authenticated user.
router.get('/my-absent-days', verifyToken, checkRole(['admin', 'employee']), getEmployeeAbsentDays);
router.get('/employee-halfdays-list', verifyToken, checkRole(['admin']), getEmployeeHalfDays);
router.get(
  '/average-working-hours',
  verifyToken,
  checkRole(['admin']),
  getAverageWorkingHoursByDayOfWeek
);

export default router;
