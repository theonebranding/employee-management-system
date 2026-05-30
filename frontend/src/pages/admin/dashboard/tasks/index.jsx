import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import Modal from '../../../../components/Modal';

const AdminTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [masterOptions, setMasterOptions] = useState({ departments: [], designations: [] });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [activeTask, setActiveTask] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const tasksTableScrollRef = useRef(null);
  const tasksScrollIntervalRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    targetDepartment: '',
    targetDesignation: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
  });

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const authHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchMasterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/tasks`, { headers: authHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to load tasks');
      setTasks(data.tasks || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employee/all?limit=1000`, { headers: authHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to load employees');
      setEmployees(data.employees || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMasterOptions = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/employee-master-options`, {
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to load options');
      setMasterOptions({
        departments: data.settings?.departments || [],
        designations: data.settings?.designations || [],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch =
        (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority]);

  const availableEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (formData.targetDepartment && emp.department !== formData.targetDepartment) return false;
      if (formData.targetDesignation && emp.designation !== formData.targetDesignation) return false;
      return true;
    });
  }, [employees, formData.targetDepartment, formData.targetDesignation]);

  const availableDesignations = useMemo(() => {
    const source = formData.targetDepartment
      ? employees.filter(emp => emp.department === formData.targetDepartment)
      : employees;
    const set = new Set(source.map(emp => emp.designation).filter(Boolean));
    if (!formData.targetDepartment) {
      (masterOptions.designations || []).forEach(item => set.add(item));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees, formData.targetDepartment, masterOptions.designations]);

  const handleAddTask = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      assignedTo: '',
      targetDepartment: '',
      targetDesignation: '',
      priority: 'medium',
      status: 'pending',
      dueDate: '',
    });
    setShowModal(true);
  };

  const handleEditTask = task => {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      targetDepartment: task.targetDepartment || '',
      targetDesignation: task.targetDesignation || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter task title');
      return;
    }

    const hasEmployee = Boolean(formData.assignedTo);
    const hasGroupFilters = Boolean(formData.targetDepartment || formData.targetDesignation);
    if (!hasEmployee && !hasGroupFilters) {
      toast.error('Select employee or department/designation');
      return;
    }

    try {
      const method = editingTask ? 'PUT' : 'POST';
      const url = editingTask ? `${BASE_URL}/tasks/${editingTask._id}` : `${BASE_URL}/tasks/create`;

      const payload = {
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo || undefined,
        targetDepartment: formData.targetDepartment,
        targetDesignation: formData.targetDesignation,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to save task');

      toast.success(editingTask ? 'Task updated' : 'Task created');
      setShowModal(false);
      fetchTasks();
    } catch (error) {
      toast.error(error.message || 'Error saving task');
    }
  };

  const handleDeleteTask = async taskId => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to delete task');
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      toast.error(error.message || 'Error deleting task');
    }
  };

  const openComments = async task => {
    setActiveTask(task);
    setShowCommentsModal(true);
    setComments([]);
    setCommentText('');
    try {
      const response = await fetch(`${BASE_URL}/tasks/${task._id}/comments`, { headers: authHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch comments');
      setComments(data.comments || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch comments');
    }
  };

  const addComment = async () => {
    const text = commentText.trim();
    if (!text || !activeTask?._id) return;
    try {
      const response = await fetch(`${BASE_URL}/tasks/${activeTask._id}/comments`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to add comment');
      setCommentText('');
      openComments(activeTask);
    } catch (error) {
      toast.error(error.message || 'Failed to add comment');
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'in-progress':
        return 'bg-info/20 text-info';
      case 'pending':
        return 'bg-warning/20 text-warning';
      default:
        return 'bg-light-bg/50 text-light-text';
    }
  };

  const getPriorityColor = priority => {
    switch (priority) {
      case 'high':
        return 'text-danger';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-success';
      default:
        return 'text-light-text/70';
    }
  };

  const getAssigneeName = assignedTo => {
    const id = assignedTo?._id || assignedTo;
    if (!id) return 'Group assignment';
    const employee = employees.find(emp => emp._id === id);
    return employee ? employee.name : 'Individual assignment';
  };

  const getAssignmentTarget = task => {
    if (task.assignedTo) return getAssigneeName(task.assignedTo);
    const dept = task.targetDepartment || 'All Departments';
    const desig = task.targetDesignation || 'All Designations';
    return `${dept} / ${desig}`;
  };

  const stopTasksAutoScroll = () => {
    if (tasksScrollIntervalRef.current) {
      clearInterval(tasksScrollIntervalRef.current);
      tasksScrollIntervalRef.current = null;
    }
  };

  const startTasksAutoScroll = direction => {
    if (!tasksTableScrollRef.current) return;
    stopTasksAutoScroll();
    const step = direction === 'left' ? -18 : 18;
    tasksScrollIntervalRef.current = setInterval(() => {
      tasksTableScrollRef.current?.scrollBy({ left: step, behavior: 'auto' });
    }, 16);
  };

  useEffect(() => () => stopTasksAutoScroll(), []);

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header title="Tasks" description="Manage and assign tasks by employee, department and designation." />

        <div className="flex items-center justify-between gap-4 flex-wrap bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-4">
          <div>
            <h2 className="text-2xl font-bold">Task Management</h2>
            <p className="text-sm text-light-text/60 dark:text-dark-text/60">{filteredTasks.length} tasks found</p>
          </div>
          <button
            onClick={handleAddTask}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
          >
            <Plus className="w-5 h-5" /> Add Task
          </button>
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-6 space-y-4">
          <h3 className="font-semibold">Filters & Search</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text/40" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border placeholder:text-light-text/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Priority</label>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle, color: 'text-success' },
            { label: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, icon: Clock, color: 'text-info' },
            { label: 'Pending', value: tasks.filter(t => t.status === 'pending').length, icon: AlertCircle, color: 'text-warning' },
            { label: 'High Priority', value: tasks.filter(t => t.priority === 'high').length, icon: AlertCircle, color: 'text-danger' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-light-text/60 dark:text-dark-text/60">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-40`} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-light-text/60 dark:text-dark-text/60">Loading tasks...</div>
          ) : filteredTasks.length > 0 ? (
            <div className="relative group/table">
              <div ref={tasksTableScrollRef} className="overflow-x-auto">
                <table className="min-w-full">
                <thead className="bg-light-bg/70 dark:bg-dark-bg/70 border-b border-light-border dark:border-dark-border text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Title</th>
                    <th className="px-6 py-3 text-left font-semibold">Assignment</th>
                    <th className="px-6 py-3 text-left font-semibold">Priority</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">Due Date</th>
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => (
                    <tr key={task._id} className="border-b border-light-border dark:border-dark-border hover:bg-light-bg/40 dark:hover:bg-dark-bg/40">
                      <td className="px-6 py-4">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-1">{task.description?.substring(0, 80) || 'No description'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-light-text/40" />
                          <span className="text-sm">{getAssignmentTarget(task)}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openComments(task)} className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors">
                            <MessageSquare className="w-4 h-4 text-primary" />
                          </button>
                          <button onClick={() => handleEditTask(task)} className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors">
                            <Edit className="w-4 h-4 text-info" />
                          </button>
                          <button onClick={() => handleDeleteTask(task._id)} className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors">
                            <Trash2 className="w-4 h-4 text-danger" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
              <div
                className="absolute left-0 top-0 bottom-0 z-10 w-12 cursor-w-resize"
                onMouseEnter={() => startTasksAutoScroll('left')}
                onMouseLeave={stopTasksAutoScroll}
                aria-hidden="true"
              />
              <div
                className="absolute right-0 top-0 bottom-0 z-10 w-12 cursor-e-resize"
                onMouseEnter={() => startTasksAutoScroll('right')}
                onMouseLeave={stopTasksAutoScroll}
                aria-hidden="true"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-light-text/60 dark:text-dark-text/60">No tasks found. Create your first task!</div>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTask ? 'Edit Task' : 'Create New Task'} size="xl">
        <div className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              className="w-full px-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border placeholder:text-light-text/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              rows="4"
              className="w-full px-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border placeholder:text-light-text/40"
            />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Specific Employee (Optional)</label>
              <select
                value={formData.assignedTo}
                onChange={e => {
                  const selectedId = e.target.value;
                  if (!selectedId) {
                    setFormData(prev => ({ ...prev, assignedTo: '' }));
                    return;
                  }
                  const selectedEmployee = employees.find(emp => emp._id === selectedId);
                  setFormData(prev => ({
                    ...prev,
                    assignedTo: selectedId,
                    targetDepartment: selectedEmployee?.department || prev.targetDepartment,
                    targetDesignation: selectedEmployee?.designation || prev.targetDesignation,
                  }));
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              >
                <option value="">None</option>
                {availableEmployees.map(emp => (
                  <option key={emp._id} value={emp._id}>{`${emp.name} (${emp.employeeCode || emp._id})`}</option>
                ))}
              </select>
              </div>
              <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Department</label>
              <select
                value={formData.targetDepartment}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    targetDepartment: e.target.value,
                    targetDesignation: '',
                    assignedTo: '',
                  }))
                }
                className="w-full px-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              >
                <option value="">All Departments</option>
                {masterOptions.departments.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              </div>
              <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Designation</label>
              <select
                value={formData.targetDesignation}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    targetDesignation: e.target.value,
                    assignedTo: '',
                  }))
                }
                className="w-full px-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              >
                <option value="">All Designations</option>
                {availableDesignations.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              </div>
              <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              </div>
              <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              </div>
              <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-light-border/70 dark:border-dark-border">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTask}
              className="px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={showCommentsModal} onClose={() => setShowCommentsModal(false)} title={activeTask ? `Comments - ${activeTask.title}` : 'Comments'} size="lg">
        <div className="space-y-3">
          <div className="max-h-72 overflow-y-auto space-y-2 border border-light-border dark:border-dark-border rounded-lg p-3 bg-light-bg dark:bg-dark-bg">
            {comments.length === 0 ? (
              <p className="text-sm text-light-text/60 dark:text-dark-text/60">No comments yet.</p>
            ) : (
              comments.map(comment => (
                <div key={comment._id} className="border border-light-border dark:border-dark-border rounded-lg p-2 bg-light-card dark:bg-dark-card">
                  <p className="text-xs text-light-text/60 dark:text-dark-text/60 mb-1">
                    {comment.authorModel} - {comment.author?.name || 'Unknown'}
                  </p>
                  <p className="text-sm">{comment.comment}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
            />
            <button onClick={addComment} className="px-3 py-2 rounded-lg bg-primary text-white inline-flex items-center gap-1">
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick={true}
        autoClose={1200}
      />
    </div>
  );
};

export default AdminTasks;
