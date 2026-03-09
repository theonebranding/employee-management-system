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
import checkRole from '../middleware/checkRole.js';

const router = express.Router();

// Admin - Add Salary
router.post('/add/:employeeId', verifyToken, checkRole(['admin']), addSalary);

// Admin - Get All Salaries
router.get('/', verifyToken, checkRole(['admin']), getAllSalaries);

// Admin - Get Salaries by Employee ID
router.get('/find/:employeeId', verifyToken, checkRole(['admin', 'employee']), getSalaryByEmployee);

router.get('/my-payslips', verifyToken, checkRole(['employee']), getMyPayslips);

router.post('/generate/:employeeId', verifyToken, checkRole(['admin']), generatePayslip);

router.get('/payslip-html/:salaryId', verifyToken, checkRole(['admin', 'employee']), getPayslipHtmlBySalaryId);

router.post('/:salaryId/send-email', verifyToken, checkRole(['admin']), sendPayslipEmail);

// Admin - Update Salary
router.patch('/:salaryId', verifyToken, checkRole(['admin']), updateSalary);

// Admin - Delete Salary
router.delete('/:salaryId', verifyToken, checkRole(['admin']), deleteSalary);

router.post('/deductions', verifyToken, checkRole(['admin']), addSalaryWithDeductions);

// Admin - Get Salary Deductions
router.get('/deductions/:salaryId', verifyToken, checkRole(['admin']), getSalaryDeductions);

export default router;
