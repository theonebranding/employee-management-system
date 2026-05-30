import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import {
  getExtraAllowances,
  createExtraAllowance,
  updateExtraAllowance,
  deleteExtraAllowance,
  syncExtraAllowancesFromAttendance,
} from '../controllers/extraAllowanceController.js';

const router = express.Router();

// Get extra allowances
router.get('/', verifyToken, getExtraAllowances);

// Create extra allowance
router.post('/', verifyToken, checkRole(['admin']), createExtraAllowance);

// Sync extra allowances from attendance
router.post('/sync-from-attendance', verifyToken, checkRole(['admin']), syncExtraAllowancesFromAttendance);

// Update extra allowance
router.put('/:allowanceId', verifyToken, checkRole(['admin']), updateExtraAllowance);

// Delete extra allowance
router.delete('/:allowanceId', verifyToken, checkRole(['admin']), deleteExtraAllowance);

export default router;
