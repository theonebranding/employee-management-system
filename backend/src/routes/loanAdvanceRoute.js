import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import {
  getLoanAdvances,
  createLoanAdvance,
  updateLoanAdvance,
  deleteLoanAdvance,
} from '../controllers/loanAdvanceController.js';

const router = express.Router();

// Get loan advances
router.get('/', verifyToken, getLoanAdvances);

// Create loan advance
router.post('/', verifyToken, checkRole(['admin']), createLoanAdvance);

// Update loan advance
router.put('/:loanId', verifyToken, checkRole(['admin']), updateLoanAdvance);

// Delete loan advance
router.delete('/:loanId', verifyToken, checkRole(['admin']), deleteLoanAdvance);

export default router;
