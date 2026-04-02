import express from 'express';
import {
  getLateCheckInReport,
  // getLateCheckIn,
  getLateCheckInDeduction,
} from '../controllers/lateCheckInController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

// Admin: Late Check-In Report
router.get('/find', verifyToken, checkPermission(PERMISSIONS.ATTENDANCE_SUMMARY_READ), getLateCheckInReport);
// router.get('/late-check-in', verifyToken, checkRole(['admin']), getLateCheckIn);
router.get('/deduction', verifyToken, checkPermission(PERMISSIONS.PAYROLL_DEDUCTIONS_READ), getLateCheckInDeduction);

export default router;
