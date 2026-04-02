import express from 'express';
import {
  addEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  getMyProfile,
  addPredefinedCheckInTime,
  deleteEmployee,
  addEmployeeDocument,
  deleteEmployeeDocument,
} from '../controllers/employeeController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import auditLog from '../middleware/auditLog.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

router.post(
  '/add',
  verifyToken,
  checkPermission(PERMISSIONS.EMPLOYEE_DIRECTORY_CREATE),
  auditLog({ action: 'create', resource: 'employee', bodyKeys: ['email', 'name', 'department', 'team'] }),
  addEmployee
);
// Admin-only endpoint to fetch all employees with pagination
router.get('/all', verifyToken, checkPermission(PERMISSIONS.EMPLOYEE_DIRECTORY_READ), getAllEmployees);

router.get('/find', verifyToken, checkPermission(PERMISSIONS.EMPLOYEE_DIRECTORY_READ), getEmployee);

router.patch(
  '/update/:id?',
  verifyToken,
  checkPermission([
    PERMISSIONS.EMPLOYEE_PROFILE_UPDATE,
    PERMISSIONS.EMPLOYEE_DIRECTORY_UPDATE,
  ]),
  auditLog({ action: 'update', resource: 'employee-profile' }),
  updateEmployee
);

router.get('/my-profile', verifyToken, checkPermission(PERMISSIONS.EMPLOYEE_PROFILE_READ), getMyProfile);

router.patch(
  '/add-checkin-time/:id?',
  verifyToken,
  checkPermission(PERMISSIONS.EMPLOYEE_DIRECTORY_UPDATE),
  auditLog({ action: 'update', resource: 'employee-checkin-policy', bodyKeys: ['predefinedCheckInTime'] }),
  addPredefinedCheckInTime
);

router.post(
  '/:id/documents',
  verifyToken,
  checkPermission(PERMISSIONS.EMPLOYEE_DOCUMENTS_MANAGE),
  auditLog({ action: 'create', resource: 'employee-document', bodyKeys: ['title', 'type', 'fileName'] }),
  addEmployeeDocument
);

router.delete(
  '/:id/documents/:documentId',
  verifyToken,
  checkPermission(PERMISSIONS.EMPLOYEE_DOCUMENTS_MANAGE),
  auditLog({ action: 'delete', resource: 'employee-document' }),
  deleteEmployeeDocument
);

router.delete(
  '/delete/:id?',
  verifyToken,
  checkPermission(PERMISSIONS.EMPLOYEE_DIRECTORY_DELETE),
  auditLog({ action: 'delete', resource: 'employee' }),
  deleteEmployee
);

export default router;
