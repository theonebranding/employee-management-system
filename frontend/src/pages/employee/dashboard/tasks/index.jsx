import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Link as LinkIcon,
  ListChecks,
  MessageSquare,
  Paperclip,
  Send,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Modal from '../../../../components/Modal';
import Header from '../../../../components/pageHeader';

const EmployeeTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  const [activeTaskFiles, setActiveTaskFiles] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const isFileTypePreviewable = (mimeType) => {
    if (!mimeType) return false;
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  };

  const handlePreviewFile = (file) => {
    setPreviewFile(file);
  };

  const handleDownloadFile = (file) => {
    try {
      const link = document.createElement('a');
      link.href = file.fileData;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to download file.');
    }
  };

  const formatExternalUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const tasksTableScrollRef = useRef(null);
  const tasksScrollIntervalRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/tasks/mine`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch tasks');
      setTasks(data.tasks || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openComments = async task => {
    setActiveTask(task);
    setShowCommentsModal(true);
    setComments([]);
    setCommentText('');
    try {
      const response = await fetch(`${BASE_URL}/tasks/${task._id}/comments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
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
          Authorization: `Bearer ${localStorage.getItem('token')}`,
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

  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await fetch(`${BASE_URL}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to update status');
      toast.success('Task status updated');
      fetchTasks();
      if (activeTask && activeTask._id === taskId) {
        setActiveTask(prev => ({ ...prev, status }));
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => (statusFilter === 'all' ? true : task.status === statusFilter))
      .filter(task => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          (task.title || '').toLowerCase().includes(q) ||
          (task.description || '').toLowerCase().includes(q)
        );
      });
  }, [tasks, statusFilter, searchQuery]);

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

  const getStatusColor = status => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'in-progress':
        return 'bg-info/20 text-info';
      case 'pending':
        return 'bg-warning/20 text-warning';
      case 'cancelled':
        return 'bg-danger/20 text-danger';
      default:
        return 'bg-light-bg/50 text-light-text';
    }
  };

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="My Tasks"
          description="Tasks assigned to you directly or via your department/designation."
          icon={<ListChecks className="w-8 h-8 text-primary" />}
        />

        <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="md:col-span-2 px-4 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat title="Total" value={tasks.length} icon={ListChecks} />
          <Stat
            title="Pending"
            value={tasks.filter(t => t.status === 'pending').length}
            icon={Clock}
          />
          <Stat
            title="In Progress"
            value={tasks.filter(t => t.status === 'in-progress').length}
            icon={AlertCircle}
          />
          <Stat
            title="Completed"
            value={tasks.filter(t => t.status === 'completed').length}
            icon={CheckCircle}
          />
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-light-text/70 dark:text-dark-text/70">
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-light-text/70 dark:text-dark-text/70">
              No tasks available.
            </div>
          ) : (
            <div className="relative group/table">
              <div ref={tasksTableScrollRef} className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Description</th>
                      <th className="px-4 py-3 text-left font-semibold">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(task => (
                      <tr
                        key={task._id}
                        className="border-t border-light-border/70 dark:border-dark-border/70 hover:bg-light-bg/20 dark:hover:bg-dark-bg/20"
                      >
                        <td className="px-4 py-3 font-medium">
                          <div>{task.title}</div>
                          {(task.attachments?.length > 0 || task.links?.length > 0) && (
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {task.attachments?.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium border border-primary/20">
                                  <Paperclip className="w-3 h-3" />
                                  {task.attachments.length} file{task.attachments.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {task.links?.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-info/10 text-info font-medium border border-info/20">
                                  <LinkIcon className="w-3 h-3" />
                                  {task.links.length} link{task.links.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-light-text/70 dark:text-dark-text/70">
                          {task.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">{task.priority}</td>
                        <td className="px-4 py-3">
                          <select
                            value={task.status}
                            onChange={e => updateTaskStatus(task._id, e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-medium"
                          >
                            <option value="pending">pending</option>
                            <option value="in-progress">in-progress</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm inline-flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-light-text/60" />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openComments(task)}
                              className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border inline-flex items-center gap-2 text-sm hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4 text-light-text/60" /> Comments
                            </button>
                            {(task.attachments?.length > 0 || task.links?.length > 0) && (
                              <button
                                type="button"
                                onClick={() => setActiveTaskFiles(task)}
                                className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary inline-flex items-center gap-2 text-sm hover:bg-primary/10 transition-colors font-medium"
                              >
                                <Paperclip className="w-4 h-4 shrink-0" /> Resources
                              </button>
                            )}
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
          )}
        </div>
      </div>

      <Modal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        title={activeTask ? `Comments - ${activeTask.title}` : 'Comments'}
        size="lg"
      >
        <div className="space-y-3">
          <div className="max-h-72 overflow-y-auto space-y-2 border border-light-border dark:border-dark-border rounded-lg p-3 bg-light-bg dark:bg-dark-bg">
            {comments.length === 0 ? (
              <p className="text-sm text-light-text/60 dark:text-dark-text/60">No comments yet.</p>
            ) : (
              comments.map(comment => (
                <div
                  key={comment._id}
                  className="border border-light-border dark:border-dark-border rounded-lg p-2 bg-light-card dark:bg-dark-card"
                >
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
            <button
              onClick={addComment}
              className="px-3 py-2 rounded-lg bg-primary text-white inline-flex items-center gap-1"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </Modal>

      {/* Task Resources Viewer Modal */}
      <Modal
        isOpen={!!activeTaskFiles}
        onClose={() => setActiveTaskFiles(null)}
        title={activeTaskFiles ? `Resources - ${activeTaskFiles.title}` : 'Resources'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Reference Files Section */}
          {activeTaskFiles?.attachments && activeTaskFiles.attachments.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-light-text/80 dark:text-dark-text/80">
                <Paperclip className="w-4 h-4 text-primary" /> Reference Files
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-light-border/50 dark:border-dark-border/50 rounded-lg p-2.5 bg-light-bg/30 dark:bg-dark-bg/30">
                {activeTaskFiles.attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-light-bg dark:bg-dark-bg border border-light-border/30 dark:border-dark-border/30 text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Paperclip className="w-4 h-4 text-light-text/40 shrink-0" />
                      <span className="truncate font-medium text-light-text dark:text-dark-text" title={file.fileName}>{file.fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isFileTypePreviewable(file.fileType) && (
                        <button
                          type="button"
                          onClick={() => handlePreviewFile(file)}
                          className="px-2.5 py-1 text-primary hover:bg-primary/10 rounded transition-colors text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        className="px-2.5 py-1 text-success hover:bg-success/10 rounded transition-colors text-xs font-semibold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference Links Section */}
          {activeTaskFiles?.links && activeTaskFiles.links.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-light-text/80 dark:text-dark-text/80">
                <LinkIcon className="w-4 h-4 text-info" /> Reference Links
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-light-border/50 dark:border-dark-border/50 rounded-lg p-2.5 bg-light-bg/30 dark:bg-dark-bg/30">
                {activeTaskFiles.links.map((link, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-light-bg dark:bg-dark-bg border border-light-border/30 dark:border-dark-border/30 text-sm">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-light-text dark:text-dark-text truncate">{link.label || 'Reference Link'}</span>
                      <span className="text-xs text-light-text/50 dark:text-dark-text/50 truncate">{link.url}</span>
                    </div>
                    <a
                      href={formatExternalUrl(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-info hover:bg-info/10 rounded transition-colors text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      Open Link <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-light-border/50 dark:border-dark-border/50">
            <button
              onClick={() => setActiveTaskFiles(null)}
              className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* File Preview Modal */}
      <Modal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={`Preview - ${previewFile?.fileName}`}
        size="2xl"
      >
        <div className="flex flex-col items-center justify-center p-2 bg-light-bg/50 dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border animate-fade-in">
          {previewFile?.fileType.startsWith('image/') ? (
            <img
              src={previewFile.fileData}
              alt={previewFile.fileName}
              className="max-h-[60vh] max-w-full rounded object-contain"
            />
          ) : previewFile?.fileType === 'application/pdf' ? (
            <iframe
              src={previewFile.fileData}
              title={previewFile.fileName}
              className="w-full h-[60vh] rounded border-none"
            />
          ) : (
            <div className="py-12 text-center text-light-text/60 dark:text-dark-text/60">
              Preview is not available for this file type.
            </div>
          )}
          <div className="flex gap-3 justify-end w-full mt-4 pt-3 border-t border-light-border dark:border-dark-border">
            <button
              onClick={() => handleDownloadFile(previewFile)}
              className="px-4 py-2 rounded-lg bg-success text-white hover:bg-success-dark transition-colors font-medium text-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Download File
            </button>
            <button
              onClick={() => setPreviewFile(null)}
              className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer position="top-right" autoClose={1200} pauseOnHover={false} limit={1} />
    </div>
  );
};

const Stat = ({ title, value, icon: Icon }) => (
  <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-light-text/60 dark:text-dark-text/60">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <Icon className="w-7 h-7 text-primary/70" />
    </div>
  </div>
);

export default EmployeeTasks;
