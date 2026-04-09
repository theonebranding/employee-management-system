import express from 'express';
import {
  updateAdminProfile,
  getAdminProfile,
  updatePassword,
  updateAttendanceSettings,
  getAttendanceSettings,
  getPayslipSettings,
  updatePayslipSettings,
  getPayrollSettings,
  updatePayrollSettings,
} from '../controllers/adminController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';

const router = express.Router();

router.get('/my-profile', verifyToken, checkRole(['admin']), getAdminProfile); // Fetch admin profile
router.patch('/update-profile', verifyToken, checkRole(['admin']), updateAdminProfile); // Update admin profile
router.patch('/update-password', verifyToken, checkRole(['admin']), updatePassword); // Update admin password
router.get('/get-attendance-settings', verifyToken, checkRole(['admin']), getAttendanceSettings); // Fetch admin attendance settings
router.patch(
  '/update-attendance-settings',
  verifyToken,
  checkRole(['admin']),
  updateAttendanceSettings
); // Update admin attendance settings
router.get('/payslip-settings', verifyToken, checkRole(['admin']), getPayslipSettings);
router.patch('/payslip-settings', verifyToken, checkRole(['admin']), updatePayslipSettings);
router.get('/payroll-settings', verifyToken, checkRole(['admin']), getPayrollSettings);
router.patch('/payroll-settings', verifyToken, checkRole(['admin']), updatePayrollSettings);

export default router;
