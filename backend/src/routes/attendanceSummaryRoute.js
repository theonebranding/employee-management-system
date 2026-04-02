import express from 'express';
import {
  getDailyAttendance,
  getMonthlyAttendance,
  getAbsenteeList,
  getPresentList,
  getEmployeeAbsenteeList,
  getEmployeeHalfDays,
  getAverageWorkingHoursByDayOfWeek,
} from '../controllers/attendanceSummaryController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

router.get('/date', verifyToken, checkPermission(PERMISSIONS.ATTENDANCE_SUMMARY_READ), getDailyAttendance);
router.get(
  '/monthly',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_SUMMARY_READ),
  getMonthlyAttendance
);
router.get('/absentee-list', verifyToken, checkPermission(PERMISSIONS.ATTENDANCE_ABSENCE_READ), getAbsenteeList);
router.get('/present-list', verifyToken, checkPermission(PERMISSIONS.ATTENDANCE_SUMMARY_READ), getPresentList);
router.get(
  '/employee-absentee-list',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_ABSENCE_READ),
  getEmployeeAbsenteeList
);
router.get(
  '/employee-halfdays-list',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_SUMMARY_READ),
  getEmployeeHalfDays
);
router.get(
  '/average-working-hours',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_SUMMARY_READ),
  getAverageWorkingHoursByDayOfWeek
);

export default router;
