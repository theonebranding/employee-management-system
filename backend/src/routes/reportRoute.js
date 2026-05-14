import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import { getAttendanceMaster, updateAttendanceMasterStatus, updateAttendanceMasterCheckout } from '../controllers/reportController.js';

const router = express.Router();

router.get('/attendance-master', verifyToken, checkRole(['admin']), getAttendanceMaster);
router.patch('/attendance-master/status', verifyToken, checkRole(['admin']), updateAttendanceMasterStatus);
router.patch('/attendance-master/checkout', verifyToken, checkRole(['admin']), updateAttendanceMasterCheckout);

export default router;
