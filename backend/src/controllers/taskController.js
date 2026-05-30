import mongoose from 'mongoose';
import Task from '../models/taskSchema.js';
import Employee from '../models/employeeSchema.js';
import TaskComment from '../models/taskCommentSchema.js';

const normalize = (value) => String(value || '').trim();
const TASK_STATUS = ['pending', 'in-progress', 'completed', 'cancelled'];

const buildEmployeeFilter = ({ assignedTo, targetDepartment, targetDesignation }) => {
  if (assignedTo) {
    return { _id: assignedTo };
  }

  const filter = {};
  if (targetDepartment) filter.department = targetDepartment;
  if (targetDesignation) filter.designation = targetDesignation;
  return filter;
};

const resolveAssignedEmployees = async ({ assignedTo, targetDepartment, targetDesignation }) => {
  if (assignedTo) {
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      throw new Error('Assigned employee id is invalid');
    }
    const employee = await Employee.findById(assignedTo).select('_id');
    if (!employee) throw new Error('Assigned employee not found');
    return [employee._id];
  }

  const hasFilter = Boolean(targetDepartment || targetDesignation);
  if (!hasFilter) {
    throw new Error('Please select employee or department/designation for assignment');
  }

  const filter = buildEmployeeFilter({ assignedTo, targetDepartment, targetDesignation });
  const employees = await Employee.find(filter).select('_id');
  if (!employees.length) {
    throw new Error('No employees matched selected department/designation');
  }
  return employees.map((emp) => emp._id);
};

const isEmployeeAssignedToTask = (task, employee) => {
  const employeeId = String(employee._id);
  if (task.assignedTo && String(task.assignedTo) === employeeId) return true;
  if ((task.assignedEmployeeIds || []).some((id) => String(id) === employeeId)) return true;

  const dept = employee.department || '';
  const desig = employee.designation || '';
  if (!dept && !desig) return false;

  if (task.targetDepartment === dept && task.targetDesignation === desig) return true;
  if (task.targetDepartment === dept && !task.targetDesignation) return true;
  if (!task.targetDepartment && task.targetDesignation === desig) return true;

  return false;
};

const canUserAccessTask = async (req, task) => {
  if (req.user.role === 'admin') return true;
  const employee = await Employee.findById(req.user._id).select('department designation');
  if (!employee) return false;
  return isEmployeeAssignedToTask(task, employee);
};

export const getAllTasks = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === 'employee') {
      const employee = await Employee.findById(req.user._id).select('department designation');
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      query.$or = [{ assignedTo: req.user._id }, { assignedEmployeeIds: req.user._id }];

      if (employee.department || employee.designation) {
        query.$or.push({
          targetDepartment: employee.department || '',
          targetDesignation: employee.designation || '',
        });
        if (employee.department)
          query.$or.push({ targetDepartment: employee.department, targetDesignation: '' });
        if (employee.designation)
          query.$or.push({ targetDepartment: '', targetDesignation: employee.designation });
      }
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email employeeCode department designation')
      .populate('assignedEmployeeIds', 'name email employeeCode department designation')
      .sort({ createdAt: -1 });

    return res.status(200).json({ message: 'Tasks fetched successfully', tasks });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

export const getMyTasks = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user._id).select('department designation');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const query = {
      $or: [{ assignedTo: req.user._id }, { assignedEmployeeIds: req.user._id }],
    };

    if (employee.department || employee.designation) {
      query.$or.push({
        targetDepartment: employee.department || '',
        targetDesignation: employee.designation || '',
      });
      if (employee.department)
        query.$or.push({ targetDepartment: employee.department, targetDesignation: '' });
      if (employee.designation)
        query.$or.push({ targetDepartment: '', targetDesignation: employee.designation });
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ message: 'My tasks fetched successfully', tasks });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching my tasks', error: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      targetDepartment,
      targetDesignation,
      priority = 'medium',
      status = 'pending',
      dueDate,
    } = req.body;

    const normalizedTitle = normalize(title);
    if (!normalizedTitle) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const normalizedDepartment = normalize(targetDepartment);
    const normalizedDesignation = normalize(targetDesignation);

    const assignedEmployeeIds = await resolveAssignedEmployees({
      assignedTo,
      targetDepartment: normalizedDepartment,
      targetDesignation: normalizedDesignation,
    });

    const task = await Task.create({
      title: normalizedTitle,
      description: normalize(description),
      assignedTo: assignedTo || undefined,
      targetDepartment: normalizedDepartment,
      targetDesignation: normalizedDesignation,
      assignedEmployeeIds,
      assignedBy: req.user._id,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Error creating task' });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name email employeeCode')
      .populate('assignedEmployeeIds', 'name email employeeCode')
      .populate('assignedBy', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const hasAccess = await canUserAccessTask(req, task);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied for this task' });
    }

    return res.status(200).json({ message: 'Task fetched successfully', task });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const {
      title,
      description,
      assignedTo,
      targetDepartment,
      targetDesignation,
      priority,
      status,
      dueDate,
    } = req.body;

    const nextTitle = title !== undefined ? normalize(title) : existingTask.title;
    if (!nextTitle) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const hasAssignedToInBody = Object.prototype.hasOwnProperty.call(req.body, 'assignedTo');
    const hasDepartmentInBody = Object.prototype.hasOwnProperty.call(req.body, 'targetDepartment');
    const hasDesignationInBody = Object.prototype.hasOwnProperty.call(
      req.body,
      'targetDesignation'
    );

    const existingAssignedToId = existingTask.assignedTo ? String(existingTask.assignedTo) : '';
    const nextAssignedTo = hasAssignedToInBody ? normalize(assignedTo) || '' : existingAssignedToId;
    const nextDepartment = hasDepartmentInBody
      ? normalize(targetDepartment)
      : existingTask.targetDepartment || '';
    const nextDesignation = hasDesignationInBody
      ? normalize(targetDesignation)
      : existingTask.targetDesignation || '';

    const assignedEmployeeIds = await resolveAssignedEmployees({
      assignedTo: nextAssignedTo || undefined,
      targetDepartment: nextDepartment,
      targetDesignation: nextDesignation,
    });

    existingTask.title = nextTitle;
    if (!existingTask.assignedBy) {
      existingTask.assignedBy = req.user._id;
    }
    if (description !== undefined) existingTask.description = normalize(description);
    existingTask.assignedTo = nextAssignedTo || undefined;
    existingTask.targetDepartment = nextDepartment;
    existingTask.targetDesignation = nextDesignation;
    existingTask.assignedEmployeeIds = assignedEmployeeIds;
    if (priority !== undefined) existingTask.priority = priority;
    if (status !== undefined) existingTask.status = status;
    if (dueDate !== undefined) existingTask.dueDate = dueDate ? new Date(dueDate) : undefined;

    await existingTask.save();

    return res.status(200).json({ message: 'Task updated successfully', task: existingTask });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Error updating task' });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

export const updateTaskStatusByEmployee = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }
    if (!TASK_STATUS.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const hasAccess = await canUserAccessTask(req, task);
    if (!hasAccess) {
      return res.status(403).json({ message: 'You are not assigned to this task' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    } else {
      task.completedAt = undefined;
      task.completedBy = undefined;
    }
    await task.save();

    return res.status(200).json({ message: 'Task status updated successfully', task });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating task status', error: error.message });
  }
};

export const addTaskComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const commentText = normalize(req.body.comment);

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }
    if (!commentText) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const hasAccess = await canUserAccessTask(req, task);
    if (!hasAccess) {
      return res.status(403).json({ message: 'You are not allowed to comment on this task' });
    }

    const comment = await TaskComment.create({
      task: task._id,
      author: req.user._id,
      authorModel: req.user.role === 'admin' ? 'Admin' : 'Employee',
      comment: commentText,
    });

    task.comments.push(comment._id);
    await task.save();

    return res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    return res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

export const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const hasAccess = await canUserAccessTask(req, task);
    if (!hasAccess) {
      return res.status(403).json({ message: 'You are not allowed to view comments of this task' });
    }

    const comments = await TaskComment.find({ task: taskId })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });

    return res.status(200).json({ message: 'Task comments fetched successfully', comments });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
};
