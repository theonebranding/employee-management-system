import express from 'express';
import {
  updateAdminProfile,
  getAdminProfile,
  updatePassword,
  updateAttendanceSettings,
  getAttendanceSettings,
  getPayslipSettings,
  updatePayslipSettings,
} from '../controllers/adminController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import auditLog from '../middleware/auditLog.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

router.get(
  '/my-profile',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN_PROFILE_READ),
  getAdminProfile
); // Fetch admin profile
router.patch(
  '/update-profile',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN_PROFILE_UPDATE),
  auditLog({ action: 'update', resource: 'admin-profile', bodyKeys: ['name', 'phoneNumber', 'email'] }),
  updateAdminProfile
); // Update admin profile
router.patch(
  '/update-password',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN_SECURITY_UPDATE),
  auditLog({ action: 'update', resource: 'admin-password' }),
  updatePassword
); // Update admin password
router.get(
  '/get-attendance-settings',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN_SETTINGS_READ),
  getAttendanceSettings
); // Fetch admin attendance settings
router.patch(
  '/update-attendance-settings',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN_SETTINGS_UPDATE),
  auditLog({
    action: 'update',
    resource: 'attendance-settings',
    bodyKeys: [
      'lateByMinutes',
      'totalWorkingHours',
      'halfDayHours',
      'minAbsentHours',
      'maxLateCheckIns',
      'geoFenceEnabled',
      'officeLatitude',
      'officeLongitude',
      'geoFenceRadiusMeters',
      'ipAllowlistEnabled',
      'allowedIps',
    ],
  }),
  updateAttendanceSettings
); // Update admin attendance settings
router.get(
  '/payslip-settings',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN_SETTINGS_READ),
  getPayslipSettings
);
router.patch(
  '/payslip-settings',
  verifyToken,
  checkPermission(PERMISSIONS.ADMIN_SETTINGS_UPDATE),
  auditLog({ action: 'update', resource: 'payslip-settings' }),
  updatePayslipSettings
);

export default router;
