import express from 'express';
import {
  addSalaryWithDeductions,
  getSalaryDeductions,
  addSalary,
  generatePayslip,
  getPayslipHtmlBySalaryId,
  sendPayslipEmail,
  getAllSalaries,
  getSalaryByEmployee,
  getMyPayslips,
  updateSalary,
  deleteSalary,
} from '../controllers/salaryController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import auditLog from '../middleware/auditLog.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

// Admin - Add Salary
router.post(
  '/add/:employeeId',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_SALARY_CREATE),
  auditLog({ action: 'create', resource: 'salary', bodyKeys: ['baseSalary', 'bonuses', 'deductions'] }),
  addSalary
);

// Admin - Get All Salaries
router.get('/', verifyToken, checkPermission(PERMISSIONS.PAYROLL_SALARY_READ), getAllSalaries);

// Admin - Get Salaries by Employee ID
router.get(
  '/find/:employeeId',
  verifyToken,
  checkPermission([PERMISSIONS.PAYROLL_SALARY_READ, PERMISSIONS.PAYROLL_PAYSLIP_READ]),
  getSalaryByEmployee
);

router.get('/my-payslips', verifyToken, checkPermission(PERMISSIONS.PAYROLL_PAYSLIP_READ), getMyPayslips);

router.post(
  '/generate/:employeeId',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_PAYSLIP_GENERATE),
  auditLog({ action: 'create', resource: 'payslip', bodyKeys: ['month', 'year', 'templateId'] }),
  generatePayslip
);

router.get(
  '/payslip-html/:salaryId',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_PAYSLIP_READ),
  getPayslipHtmlBySalaryId
);

router.post(
  '/:salaryId/send-email',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_PAYSLIP_EMAIL),
  auditLog({ action: 'send', resource: 'payslip-email' }),
  sendPayslipEmail
);

// Admin - Update Salary
router.patch(
  '/:salaryId',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_SALARY_UPDATE),
  auditLog({ action: 'update', resource: 'salary', bodyKeys: ['baseSalary', 'bonuses', 'deductions'] }),
  updateSalary
);

// Admin - Delete Salary
router.delete(
  '/:salaryId',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_SALARY_DELETE),
  auditLog({ action: 'delete', resource: 'salary' }),
  deleteSalary
);

router.post(
  '/deductions',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_DEDUCTIONS_MANAGE),
  auditLog({ action: 'create', resource: 'salary-deductions' }),
  addSalaryWithDeductions
);

// Admin - Get Salary Deductions
router.get(
  '/deductions/:salaryId',
  verifyToken,
  checkPermission(PERMISSIONS.PAYROLL_DEDUCTIONS_READ),
  getSalaryDeductions
);

export default router;
