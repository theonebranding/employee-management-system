import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import {
  getAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
} from '../controllers/roleController.js';

const router = express.Router();

// Get all roles
router.get('/', verifyToken, checkRole(['admin']), getAllRoles);

// Create role
router.post('/', verifyToken, checkRole(['admin']), createRole);

// Get role by ID
router.get('/:roleId', verifyToken, checkRole(['admin']), getRoleById);

// Update role
router.put('/:roleId', verifyToken, checkRole(['admin']), updateRole);

// Delete role
router.delete('/:roleId', verifyToken, checkRole(['admin']), deleteRole);

export default router;
