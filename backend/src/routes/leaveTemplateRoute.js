import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import {
  assignLeaveTemplate,
  createLeaveTemplate,
  deleteLeaveTemplate,
  getEmployeeLeaveTemplate,
  getMyLeaveTemplate,
  getEmployeesWithTemplate,
  getLeaveTemplates,
  updateLeaveTemplate,
} from '../controllers/leaveTemplateController.js';

const router = express.Router();

router.get('/templates', verifyToken, checkRole(['admin']), getLeaveTemplates);
router.post('/templates', verifyToken, checkRole(['admin']), createLeaveTemplate);
router.patch('/templates/:templateId', verifyToken, checkRole(['admin']), updateLeaveTemplate);
router.delete('/templates/:templateId', verifyToken, checkRole(['admin']), deleteLeaveTemplate);

router.get('/employees', verifyToken, checkRole(['admin']), getEmployeesWithTemplate);
router.post('/assign', verifyToken, checkRole(['admin']), assignLeaveTemplate);
router.get(
  '/employee-template/:employeeId',
  verifyToken,
  checkRole(['admin']),
  getEmployeeLeaveTemplate
);
router.get('/my-template', verifyToken, checkRole(['employee']), getMyLeaveTemplate);

export default router;
