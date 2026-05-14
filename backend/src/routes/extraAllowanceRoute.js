import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import {
  getExtraAllowances,
  createExtraAllowance,
  updateExtraAllowance,
  deleteExtraAllowance,
} from '../controllers/extraAllowanceController.js';

const router = express.Router();

// Get extra allowances
router.get('/', verifyToken, getExtraAllowances);

// Create extra allowance
router.post('/', verifyToken, checkRole(['admin']), createExtraAllowance);

// Update extra allowance
router.put('/:allowanceId', verifyToken, checkRole(['admin']), updateExtraAllowance);

// Delete extra allowance
router.delete('/:allowanceId', verifyToken, checkRole(['admin']), deleteExtraAllowance);

export default router;
