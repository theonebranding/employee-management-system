import express from 'express';
import {
  checkIn,
  checkOut,
  startRecess,
  endRecess,
  updateAttendance,
  getCurrentStatus,
} from '../controllers/attendanceController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import validateZod from '../middleware/validateZod.js';
import {
  attendanceCheckInSchema,
  attendanceCheckOutSchema,
  attendanceParamsSchema,
  updateAttendanceSchema,
} from '../validations/attendanceValidation.js';

const router = express.Router();

router.post('/checkin', verifyToken, checkRole(['employee']), validateZod(attendanceCheckInSchema), checkIn); // Check-In Route
router.post('/checkout', verifyToken, checkRole(['employee']), validateZod(attendanceCheckOutSchema), checkOut); // Check-Out Route
router.post('/start-recess', verifyToken, checkRole(['employee']), startRecess); // Start Recess Route
router.post('/end-recess', verifyToken, checkRole(['employee']), endRecess); // End Recess Route
router.put(
  '/update-attendance/:attendanceId',
  verifyToken,
  checkRole(['admin']),
  validateZod(attendanceParamsSchema, 'params'),
  validateZod(updateAttendanceSchema),
  updateAttendance
); // Update Attendance Route
router.get('/status', verifyToken, getCurrentStatus); // Get Current Status Route

export default router;
