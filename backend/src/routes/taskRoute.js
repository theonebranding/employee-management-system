import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';
import {
  addTaskComment,
  createTask,
  deleteTask,
  getAllTasks,
  getTaskComments,
  getMyTasks,
  getTaskById,
  updateTask,
  updateTaskStatusByEmployee,
} from '../controllers/taskController.js';

const router = express.Router();

router.get('/', verifyToken, getAllTasks);
router.get('/all', verifyToken, getAllTasks);
router.get('/mine', verifyToken, checkRole(['employee']), getMyTasks);
router.post('/', verifyToken, checkRole(['admin']), createTask);
router.post('/create', verifyToken, checkRole(['admin']), createTask);
router.get('/:taskId', verifyToken, getTaskById);
router.put('/:taskId', verifyToken, checkRole(['admin']), updateTask);
router.delete('/:taskId', verifyToken, checkRole(['admin']), deleteTask);
router.patch('/:taskId/status', verifyToken, checkRole(['employee']), updateTaskStatusByEmployee);
router.post('/:taskId/comments', verifyToken, addTaskComment);
router.get('/:taskId/comments', verifyToken, getTaskComments);

export default router;
