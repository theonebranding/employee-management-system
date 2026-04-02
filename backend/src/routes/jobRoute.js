import express from 'express';
import { listAsyncJobs } from '../controllers/jobController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import checkPermission from '../middleware/checkPermission.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/', verifyToken, checkPermission(PERMISSIONS.OPERATIONS_JOB_READ), listAsyncJobs);

export default router;
