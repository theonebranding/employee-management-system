import express from 'express';
import {
  getWorkflowInstanceTimeline,
  listWorkflowInstances,
  listWorkflows,
} from '../controllers/workflowController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkPermission from '../middleware/checkPermission.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = express.Router();

router.get('/', verifyToken, checkPermission(PERMISSIONS.WORKFLOW_MANAGE), listWorkflows);
router.get(
  '/instances',
  verifyToken,
  checkPermission(PERMISSIONS.WORKFLOW_INSTANCE_READ),
  listWorkflowInstances
);
router.get(
  '/instances/:entityType/:entityId',
  verifyToken,
  checkPermission(PERMISSIONS.WORKFLOW_INSTANCE_READ),
  getWorkflowInstanceTimeline
);

export default router;
