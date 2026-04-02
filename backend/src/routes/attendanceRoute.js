import express from 'express';
import {
  checkIn,
  checkOut,
  startRecess,
  endRecess,
  updateAttendance,
  getCurrentStatus,
  getMonthlyAbsenceDays,
} from '../controllers/attendanceController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import auditLog from '../middleware/auditLog.js';
import validateZod from '../middleware/validateZod.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  attendanceCheckInSchema,
  attendanceCheckOutSchema,
  attendanceParamsSchema,
  updateAttendanceSchema,
} from '../validations/attendanceValidation.js';

const router = express.Router();

router.post(
  '/checkin',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_SELF_CHECKIN),
  auditLog({ action: 'create', resource: 'attendance-checkin', bodyKeys: ['latitude', 'longitude'] }),
  validateZod(attendanceCheckInSchema),
  checkIn
); // Check-In Route
router.post(
  '/checkout',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_SELF_CHECKOUT),
  auditLog({ action: 'update', resource: 'attendance-checkout', bodyKeys: ['latitude', 'longitude'] }),
  validateZod(attendanceCheckOutSchema),
  checkOut
); // Check-Out Route
router.post(
  '/start-recess',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_SELF_RECESS),
  auditLog({ action: 'update', resource: 'attendance-recess-start' }),
  startRecess
); // Start Recess Route
router.post(
  '/end-recess',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_SELF_RECESS),
  auditLog({ action: 'update', resource: 'attendance-recess-end' }),
  endRecess
); // End Recess Route
router.put(
  '/update-attendance/:attendanceId',
  verifyToken,
  checkPermission(PERMISSIONS.ATTENDANCE_RECORDS_UPDATE),
  auditLog({ action: 'update', resource: 'attendance-record' }),
  validateZod(attendanceParamsSchema, 'params'),
  validateZod(updateAttendanceSchema),
  updateAttendance
); // Update Attendance Route
router.get('/status', verifyToken, checkPermission(PERMISSIONS.ATTENDANCE_SELF_STATUS), getCurrentStatus); // Get Current Status Route
router.get('/absent-days', verifyToken, checkPermission(PERMISSIONS.ATTENDANCE_ABSENCE_READ), getMonthlyAbsenceDays);

export default router;
