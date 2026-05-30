import 'react-toastify/dist/ReactToastify.css';

import {
  BadgeCheck,
  Ban,
  Calendar,
  CalendarDays,
  Check,
  Clock,
  FileText,
  NotebookTabsIcon,
  Plus,
  SortAsc,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const Leaves = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignedTemplate, setAssignedTemplate] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [requestMode, setRequestMode] = useState('template');
  const [documentUploading, setDocumentUploading] = useState(false);
  const [newRequest, setNewRequest] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    leaveCategory: 'sick_leave',
    templateId: '',
    documentName: '',
    documentType: '',
    documentData: '',
  });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortOption, setSortOption] = useState('latest'); // Sorting option

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchAssignedTemplate = async () => {
    setTemplateLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/my-template`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAssignedTemplate(null);
        return;
      }

      setAssignedTemplate({
        template: data.template,
        balance: data.balance,
      });
      setNewRequest(prev => ({ ...prev, templateId: data.template?._id || '' }));
    } catch (error) {
      console.error('Error fetching assigned template:', error);
      setAssignedTemplate(null);
    } finally {
      setTemplateLoading(false);
    }
  };

  const fetchUserLeaves = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/leaves/employee-leaves`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch leaves.');
      const { leaves } = await response.json();
      setLeaveRequests(leaves);
      // toast.success('Leaves fetched successfully.');
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast.error(error.message || 'Failed to fetch leaves.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = async e => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/leaves/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newRequest,
          leaveMode: requestMode,
          templateId: requestMode === 'template' ? newRequest.templateId : '',
          documentName: requestMode === 'special' ? newRequest.documentName : '',
          documentType: requestMode === 'special' ? newRequest.documentType : '',
          documentData: requestMode === 'special' ? newRequest.documentData : '',
        }),
      });
      if (!response.ok) throw new Error('Failed to create leave request.');
      const { message } = await response.json();
      toast.success(message || 'Leave request created successfully.');
      setIsModalOpen(false);
      setNewRequest({
        startDate: '',
        endDate: '',
        reason: '',
        leaveCategory: 'sick_leave',
        templateId: assignedTemplate?.template?._id || '',
        documentName: '',
        documentType: '',
        documentData: '',
      });
      setRequestMode(assignedTemplate?.template ? 'template' : 'special');
      fetchUserLeaves();
    } catch (error) {
      console.error('Error creating leave request:', error);
      toast.error(error.message || 'Failed to create leave request.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = status => {
    const configs = {
      approved: {
        color: 'bg-success/10 text-success ring-success/30',
        icon: <Check className="w-4 h-4" />,
      },
      rejected: {
        color: 'bg-danger/10 text-danger ring-danger/30',
        icon: <X className="w-4 h-4" />,
      },
      pending: {
        color: 'bg-warning/10 text-warning ring-warning/30',
        icon: <Clock className="w-4 h-4" />,
      },
    };
    return configs[status.toLowerCase()] || configs.pending;
  };

  // Sorting the leave requests based on selected sort option
  const sortedRequests = [...leaveRequests].sort((a, b) => {
    if (sortOption === 'latest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortOption === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortOption === 'approved') {
      if (a.status.toLowerCase() === 'approved' && b.status.toLowerCase() !== 'approved') return -1;
      if (a.status.toLowerCase() !== 'approved' && b.status.toLowerCase() === 'approved') return 1;
      return 0;
    }
    return 0;
  });

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div
      className={`rounded-xl p-6 ring-1 transform hover:scale-105 transition-all ${colorClass} bg-light-card dark:bg-dark-card shadow-card ring-light-border dark:ring-dark-border`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-light-text dark:text-dark-text text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 text-light-text dark:text-dark-text">{value}</p>
        </div>
        <div className="p-3 rounded-lg bg-light-bg dark:bg-dark-bg">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    fetchUserLeaves();
    fetchAssignedTemplate();
  }, []);

  useEffect(() => {
    if (assignedTemplate?.template && requestMode === 'template') {
      setNewRequest(prev => ({ ...prev, templateId: assignedTemplate.template._id }));
    }
    if (!assignedTemplate?.template) {
      setRequestMode('special');
    }
  }, [assignedTemplate, requestMode]);

  const handleDocumentChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocumentUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      setNewRequest(prev => ({
        ...prev,
        documentName: file.name,
        documentType: file.type,
        documentData: String(dataUrl || ''),
      }));
    } catch (error) {
      toast.error(error.message || 'Failed to upload document.');
    } finally {
      setDocumentUploading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Leave Requests"
          description="Manage your leave requests and track their status."
          icon={<NotebookTabsIcon className="w-8 h-8 text-light-text dark:text-dark-text" />}
        />

        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-light-text dark:text-dark-text opacity-70">Assigned leave template</p>
              <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mt-1">
                {templateLoading
                  ? 'Loading template...'
                  : assignedTemplate?.template?.name || 'No leave template assigned yet'}
              </h3>
              <p className="text-sm text-light-text dark:text-dark-text opacity-70 mt-2">
                {assignedTemplate?.template?.description || 'Available leave balance will appear here when a template is assigned.'}
              </p>
            </div>
            {assignedTemplate?.balance && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                <div className="px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg">
                  <p className="text-xs opacity-70 text-light-text dark:text-dark-text">Total</p>
                  <p className="text-lg font-semibold text-light-text dark:text-dark-text">{assignedTemplate.balance.total}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg">
                  <p className="text-xs opacity-70 text-light-text dark:text-dark-text">Used</p>
                  <p className="text-lg font-semibold text-light-text dark:text-dark-text">{assignedTemplate.balance.used}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-success/10">
                  <p className="text-xs opacity-70 text-success">Remaining</p>
                  <p className="text-lg font-semibold text-success">{assignedTemplate.balance.remaining}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-info/10">
                  <p className="text-xs opacity-70 text-info">Carry Forward</p>
                  <p className="text-lg font-semibold text-info">{assignedTemplate.balance.carryForwardDays || 0}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-warning/10">
                  <p className="text-xs opacity-70 text-warning">Encashable</p>
                  <p className="text-lg font-semibold text-warning">{assignedTemplate.balance.encashmentDays || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setRequestMode('template')}
              disabled={!assignedTemplate?.template}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${requestMode === 'template' ? 'bg-primary text-white border-primary' : 'bg-white/90 dark:bg-dark-bg border-light-border dark:border-dark-border text-light-text dark:text-dark-text'} ${!assignedTemplate?.template ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Template Leave
            </button>
            <button
              type="button"
              onClick={() => setRequestMode('special')}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${requestMode === 'special' ? 'bg-primary text-white border-primary' : 'bg-white/90 dark:bg-dark-bg border-light-border dark:border-dark-border text-light-text dark:text-dark-text'}`}
            >
              Special Document Leave
            </button>
          </div>
          <p className="text-sm text-light-text dark:text-dark-text opacity-70 mt-3">
            Template leave auto-uses your assigned quota. Special leave requires a document and will wait for admin review.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Approved Leaves"
            value={leaveRequests.filter(req => req.status.toLowerCase() === 'approved').length}
            icon={BadgeCheck}
            colorClass="bg-success/10 text-success ring-success/30"
          />
          <StatCard
            title="Pending Leaves"
            value={leaveRequests.filter(req => req.status.toLowerCase() === 'pending').length}
            icon={Clock}
            colorClass="bg-warning/10 text-warning ring-warning/30"
          />
          <StatCard
            title="Rejected Leaves"
            value={leaveRequests.filter(req => req.status.toLowerCase() === 'rejected').length}
            icon={Ban}
            colorClass="bg-danger/10 text-danger ring-danger/30"
          />
        </div>

        {/* Sorting Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4 sm:gap-8 mb-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 transition-all transform hover:scale-105 focus:ring-2 focus:ring-primary-light focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            New Leave Request
          </button>
          <div className="relative">
            <SortAsc className="absolute left-3 top-2.5 h-5 w-5 text-light-text dark:text-dark-text opacity-70" />
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="pl-9 pr-4 py-2 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-sm text-light-text dark:text-dark-text"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>

        {/* Leave Requests List */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">
            Recent Requests
          </h2>
          <div className="space-y-4">
            {sortedRequests.map(request => {
              const statusConfig = getStatusConfig(request.status);
              return (
                <div
                  key={request._id}
                  className="bg-light-bg dark:bg-dark-bg rounded-xl p-6 ring-1 ring-light-border dark:ring-dark-border hover:bg-light-card dark:hover:bg-dark-card transition-all"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1 ${statusConfig.color}`}
                        >
                          {statusConfig.icon}
                          <span className="capitalize">{request.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-light-text dark:text-dark-text">
                        <FileText className="w-4 h-4" />
                        <span>{request.reason}</span>
                      </div>
                      <div className="flex items-center gap-2 text-light-text dark:text-dark-text opacity-70 text-sm">
                        <CalendarDays className="w-4 h-4" />
                        <span>
                          {new Date(request.startDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          -{' '}
                          {new Date(request.endDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-light-text dark:text-dark-text opacity-70">
                      <Calendar className="w-4 h-4 mr-2" />
                      Submitted on {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-light-card dark:bg-dark-card rounded-2xl w-full max-w-md ring-1 ring-light-border dark:ring-dark-border shadow-card flex flex-col max-h-[90vh]">
            <div className="flex items-center gap-3 px-8 pt-8 pb-4 shrink-0">
              <div className="bg-primary/10 p-2 rounded-lg">
                <CalendarDays className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                New Leave Request
              </h2>
            </div>
            <form
              onSubmit={handleNewRequest}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-8 pb-2 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newRequest.startDate}
                    onChange={e => setNewRequest({ ...newRequest, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newRequest.endDate}
                    onChange={e => setNewRequest({ ...newRequest, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    Reason
                  </label>
                  <textarea
                    value={newRequest.reason}
                    onChange={e => setNewRequest({ ...newRequest, reason: e.target.value })}
                    className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text h-32 resize-none"
                    placeholder="Please provide a detailed reason for your leave request..."
                    required
                  />
                </div>
                {requestMode === 'special' && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                        Special Leave Type
                      </label>
                      <select
                        value={newRequest.leaveCategory}
                        onChange={e => setNewRequest({ ...newRequest, leaveCategory: e.target.value })}
                        className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                        required
                      >
                        <option value="sick_leave">Sick Leave</option>
                        <option value="medical_leave">Medical Leave</option>
                        <option value="bed_rest">Bed Rest</option>
                        <option value="paternity_leave">Paternity Leave</option>
                        <option value="maternity_leave">Maternity Leave</option>
                        <option value="emergency_leave">Emergency Leave</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                        Supporting Document
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleDocumentChange}
                        className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border text-light-text dark:text-dark-text"
                        required
                      />
                      <p className="text-xs text-light-text dark:text-dark-text opacity-70">
                        Accepted: image or PDF. The file is attached to the request for admin review.
                      </p>
                      {documentUploading && <p className="text-xs text-primary">Reading document...</p>}
                      {newRequest.documentName && (
                        <p className="text-xs text-success">Uploaded: {newRequest.documentName}</p>
                      )}
                    </div>
                  </>
                )}
                {requestMode === 'template' && assignedTemplate?.template && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-light-text dark:text-dark-text">
                    This request will use your assigned template <span className="font-semibold">{assignedTemplate.template.name}</span> and will auto-approve when the template policy allows it and the request stays within the available balance.
                    {assignedTemplate?.balance?.carryForwardDays !== undefined ? (
                      <span className="block mt-2 text-xs opacity-80">
                        Carry-forward available this period: {assignedTemplate.balance.carryForwardDays || 0}. Extra unused leaves beyond the limit: {assignedTemplate.balance.encashmentDays || 0}.
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-8 py-4 border-t border-light-border dark:border-dark-border shrink-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-light-bg dark:bg-dark-bg hover:bg-light-card dark:hover:bg-dark-card text-light-text dark:text-dark-text rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick={true}
        autoClose={1000}
      />
    </div>
  );
};

export default Leaves;
