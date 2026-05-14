import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import {
  getPayrollPreview,
  processPayrollForEmployee,
  processPayrollForAll,
  getPayrolls,
  getPayrollByEmployee,
  getPayrollPayslipHtml,
  getPayrollHistory,
} from '../controllers/payrollController.js';

const router = express.Router();

// Get payroll preview (All employees for a month)
router.get('/preview', verifyToken, checkRole(['admin']), getPayrollPreview);

// Process payroll for single employee
router.post('/process/:employeeId', verifyToken, checkRole(['admin']), processPayrollForEmployee);

// Process payroll for all employees
router.post('/process-all', verifyToken, checkRole(['admin']), processPayrollForAll);

// Get payrolls (with filtering, pagination)
router.get('/', verifyToken, checkRole(['admin']), getPayrolls);

// Get payroll by employee
router.get('/employee/:employeeId', verifyToken, getPayrollByEmployee);

// Get payroll payslip HTML
router.get('/payslip/:payrollId', verifyToken, getPayrollPayslipHtml);

// Get payroll history
router.get('/history', verifyToken, checkRole(['admin']), getPayrollHistory);

export default router;
