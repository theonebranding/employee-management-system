import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  Search,
  User,
  Calendar,
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Header from '../../../../components/pageHeader';
import Modal from '../../../../components/Modal';

const AdminTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
  });

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/task/all`, {
        headers: authHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employee/all?limit=100`, {
        headers: authHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || task.assignedTo === filterAssignee;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee]);

  const handleAddTask = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      assignedTo: '',
      priority: 'medium',
      status: 'pending',
      dueDate: '',
    });
    setShowModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSaveTask = async () => {
    if (!formData.title || !formData.assignedTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const method = editingTask ? 'PUT' : 'POST';
      const url = editingTask
        ? `${BASE_URL}/task/${editingTask._id}`
        : `${BASE_URL}/task/create`;

      const response = await fetch(url, {
        method,
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingTask ? 'Task updated' : 'Task created');
        setShowModal(false);
        fetchTasks();
      } else {
        toast.error('Failed to save task');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Error saving task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${BASE_URL}/task/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (response.ok) {
        toast.success('Task deleted');
        fetchTasks();
      } else {
        toast.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Error deleting task');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getAssigneeName = (id) => {
    const employee = employees.find((emp) => emp._id === id);
    return employee ? employee.name : 'Unassigned';
  };

  return (
    <div className="flex-1 bg-light-bg dark:bg-dark-bg min-h-full">
      <Header
        title="Tasks"
        description="Manage and track team tasks and assignments."
      />
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">
                Task Management
              </h2>
              <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                {filteredTasks.length} tasks found
              </p>
            </div>
            <button
              onClick={handleAddTask}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-light-border/70 dark:border-dark-border p-6 space-y-4">
            <h3 className="font-semibold text-light-text dark:text-dark-text">Filters & Search</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text/40" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text placeholder:text-light-text/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                  Priority
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                  Assignee
                </label>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                >
                  <option value="all">All Assignees</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Completed',
                value: tasks.filter((t) => t.status === 'completed').length,
                icon: CheckCircle,
                color: 'text-green-500',
              },
              {
                label: 'In Progress',
                value: tasks.filter((t) => t.status === 'in-progress').length,
                icon: Clock,
                color: 'text-blue-500',
              },
              {
                label: 'Pending',
                value: tasks.filter((t) => t.status === 'pending').length,
                icon: AlertCircle,
                color: 'text-yellow-500',
              },
              {
                label: 'High Priority',
                value: tasks.filter((t) => t.priority === 'high').length,
                icon: AlertCircle,
                color: 'text-red-500',
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-dark-card rounded-2xl border border-light-border/70 dark:border-dark-border p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-light-text/60 dark:text-dark-text/60">{stat.label}</p>
                    <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color} opacity-20`} />
                </div>
              </div>
            ))}
          </div>

          {/* Tasks Table */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-light-border/70 dark:border-dark-border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60">Loading tasks...</p>
              </div>
            ) : filteredTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-light-bg dark:bg-dark-bg border-b border-light-border/70 dark:border-dark-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                        Assignee
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-light-text/70 dark:text-dark-text/70">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr
                        key={task._id}
                        className="border-b border-light-border/70 dark:border-dark-border hover:bg-light-bg/50 dark:hover:bg-dark-bg/50"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-light-text dark:text-dark-text">
                              {task.title}
                            </p>
                            <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-1">
                              {task.description?.substring(0, 50)}...
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-light-text/40" />
                            <span className="text-sm text-light-text dark:text-dark-text">
                              {getAssigneeName(task.assignedTo)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-sm font-medium ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-light-text dark:text-dark-text">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditTask(task)}
                              className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
                            >
                              <Edit className="w-4 h-4 text-blue-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task._id)}
                              className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60">
                  No tasks found. Create your first task!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              className="w-full px-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text placeholder:text-light-text/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              rows="4"
              className="w-full px-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text placeholder:text-light-text/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Assign To *
              </label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-light-border/70 dark:border-dark-border">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTask}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
};

export default AdminTasks;
