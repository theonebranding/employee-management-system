import express from 'express';
import {
  addEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  getMyProfile,
  addPredefinedCheckInTime,
  deleteEmployee,
  deleteEmployeeByCode,
  addEmployeeDocument,
  deleteEmployeeDocument,
} from '../controllers/employeeController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';

const router = express.Router();

router.post('/add', verifyToken, checkRole(['admin']), addEmployee);
// Admin-only endpoint to fetch all employees with pagination
router.get('/all', verifyToken, checkRole(['admin']), getAllEmployees);

router.get('/find', verifyToken, checkRole(['admin', 'employee']), getEmployee);

router.patch('/update/:id?', verifyToken, checkRole(['employee', 'admin']), updateEmployee);

router.get('/my-profile', verifyToken, checkRole(['employee']), getMyProfile);

router.patch('/add-checkin-time/:id?', verifyToken, checkRole(['admin']), addPredefinedCheckInTime);

router.post('/:id/documents', verifyToken, checkRole(['admin']), addEmployeeDocument);

router.delete(
  '/:id/documents/:documentId',
  verifyToken,
  checkRole(['admin']),
  deleteEmployeeDocument
);

router.delete('/delete/:id?', verifyToken, checkRole(['admin']), deleteEmployee);

router.delete(
  '/delete-by-code/:employeeCode',
  verifyToken,
  checkRole(['admin']),
  deleteEmployeeByCode
);

export default router;
