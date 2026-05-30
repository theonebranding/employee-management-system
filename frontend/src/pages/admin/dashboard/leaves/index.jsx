import 'react-toastify/dist/ReactToastify.css';

import { format } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Filter,
  Loader2,
  NotebookTabsIcon,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const AdminLeaveManagement = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentLeave, setCurrentLeave] = useState(null);
  const [newStatus, setNewStatus] = useState('pending');
  const [newIsPaidLeave, setNewIsPaidLeave] = useState(false);
  const [useTemplateQuota, setUseTemplateQuota] = useState(false);
  const [templateQuota, setTemplateQuota] = useState(null);
  const [templateQuotaLoading, setTemplateQuotaLoading] = useState(false);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState(null);
  // eslint-disable-next-line no-unused-vars, unused-imports/no-unused-vars
  const [hoveredRequest, setHoveredRequest] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRequests, setTotalRequests] = useState(0);

  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchEmployeeTemplateQuota = async employeeId => {
    if (!employeeId) return;

    setTemplateQuotaLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/employee-template/${employeeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setTemplateQuota(null);
        return;
      }

      setTemplateQuota({
        template: data.template,
        balance: data.balance,
      });
    } catch (error) {
      setTemplateQuota(null);
    } finally {
      setTemplateQuotaLoading(false);
    }
  };

  const fetchLeaves = async (page = currentPage) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: pageSize,
        sortOrder: sortOrder === 'newest' ? 'desc' : 'asc',
      });

      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (searchQuery) queryParams.append('search', searchQuery);
      if (dateFilter === 'custom' && startDate && endDate) {
        queryParams.append('startDate', startDate);
        queryParams.append('endDate', endDate);
      } else if (dateFilter !== 'all') {
        queryParams.append('dateFilter', dateFilter);
      }

      const response = await fetch(`${BASE_URL}/leaves?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch leave requests.');

      const data = await response.json();
      setLeaveRequests(data.leaves || []);
      setTotalPages(data.totalPages || 1);
      setTotalRequests(data.totalLeaves || 0);
      setCurrentPage(page);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch leave requests.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const deleteLeaveRequest = async () => {
    if (!leaveToDelete) return;
    try {
      const response = await fetch(`${BASE_URL}/leaves/delete/${leaveToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to delete leave request.');

      fetchLeaves();
      toast.success('Leave request deleted successfully.');
      setDeleteConfirmOpen(false);
      setLeaveToDelete(null);
    } catch (error) {
      toast.error(error.message || 'Failed to delete leave request.');
    }
  };

  const updateLeaveStatus = async () => {
    if (!currentLeave) return;
    try {
      const response = await fetch(`${BASE_URL}/leaves/update/${currentLeave._id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          isPaidLeave: newStatus === 'approved' ? newIsPaidLeave : false,
          useTemplateQuota: newStatus === 'approved' ? useTemplateQuota : false,
          templateId: useTemplateQuota ? templateQuota?.template?._id : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update leave status.');

      const { message } = await response.json();
      toast.success(message || 'Leave status updated successfully.');
      fetchLeaves();
      setIsSlideOverOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update leave status.');
    }
  };

  const getStatusStyles = status => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-success/10 text-success border border-success/20';
      case 'rejected':
        return 'bg-danger/10 text-danger border border-danger/20';
      default:
        return 'bg-warning/10 text-warning border border-warning/20';
    }
  };

  const getStatusIcon = status => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleSearch = e => {
    e.preventDefault();
    fetchLeaves(1);
  };

  const refreshData = () => {
    setIsRefreshing(true);
    fetchLeaves();
  };

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sortOrder, pageSize, dateFilter]);

  useEffect(() => {
    if (activeTab === 'create') {
      fetchTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (dateFilter !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  }, [dateFilter]);

  useEffect(() => {
    if (!isSlideOverOpen || !currentLeave?.employee?._id) {
      setTemplateQuota(null);
      return;
    }

    setUseTemplateQuota(false);
    fetchEmployeeTemplateQuota(currentLeave.employee._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSlideOverOpen, currentLeave]);

  const formatDate = dateString => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return { dateString };
    }
  };

  const tabs = [
    { id: 'requests', label: 'Leave Requests' },
    { id: 'create', label: 'Create New Leave' },
  ];

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/templates`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch leave templates.');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch leave templates.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const deleteTemplate = async templateId => {
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to delete leave template.');

      await fetchTemplates();
      toast.success('Leave template deleted successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to delete leave template.');
    }
  };

  const createTemplate = async payload => {
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create leave template.');
      }

      await fetchTemplates();
      toast.success(data.message || 'Leave template created successfully.');
      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to create leave template.');
      return false;
    }
  };

  const updateTemplate = async (templateId, payload) => {
    try {
      const response = await fetch(`${BASE_URL}/leave-templates/templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update leave template.');
      }

      await fetchTemplates();
      toast.success(data.message || 'Leave template updated successfully.');
      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to update leave template.');
      return false;
    }
  };

  const renderRequestsSection = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-4">
        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-border dark:border-dark-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-light-text dark:text-dark-text opacity-70 text-sm">
                Total Requests
              </p>
              <h3 className="text-2xl font-semibold mt-1 text-light-text dark:text-dark-text">
                {totalRequests}
              </h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <NotebookTabsIcon className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-border dark:border-dark-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-light-text dark:text-dark-text opacity-70 text-sm">Approved</p>
              <h3 className="text-2xl font-semibold mt-1 text-light-text dark:text-dark-text">
                {leaveRequests.filter(r => r.status === 'approved').length}
              </h3>
            </div>
            <div className="p-2 bg-success/10 rounded-lg">
              <Check className="w-5 h-5 text-success" />
            </div>
          </div>
        </div>
        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-border dark:border-dark-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-light-text dark:text-dark-text opacity-70 text-sm">Pending</p>
              <h3 className="text-2xl font-semibold mt-1 text-light-text dark:text-dark-text">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </h3>
            </div>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Clock className="w-5 h-5 text-warning" />
            </div>
          </div>
        </div>
        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-border dark:border-dark-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-light-text dark:text-dark-text opacity-70 text-sm">Rejected</p>
              <h3 className="text-2xl font-semibold mt-1 text-light-text dark:text-dark-text">
                {leaveRequests.filter(r => r.status === 'rejected').length}
              </h3>
            </div>
            <div className="p-2 bg-danger/10 rounded-lg">
              <X className="w-5 h-5 text-danger" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-light-text dark:text-dark-text opacity-70">
            Loading leave requests...
          </p>
        </div>
      ) : leaveRequests.length > 0 ? (
        <>
          <div className="grid gap-4 mb-6">
            {leaveRequests.map(request => (
              <div
                key={request._id}
                className="group bg-light-card dark:bg-dark-card rounded-lg p-6 shadow-lg border border-light-border dark:border-dark-border hover:border-primary/50 transition-all duration-300"
                onMouseEnter={() => setHoveredRequest(request._id)}
                onMouseLeave={() => setHoveredRequest(null)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-light-bg dark:bg-dark-bg rounded-full">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-light-text dark:text-dark-text">
                          {request.employeeEmail}
                        </p>
                        <p className="text-xs text-light-text dark:text-dark-text opacity-50">
                          Requested {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-lg font-medium text-light-text dark:text-dark-text">
                      {request.reason}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {request.templateName && (
                        <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                          Template: {request.templateName}
                        </span>
                      )}
                      {request.leaveCategory && (
                        <span className="px-2 py-1 rounded-full text-xs bg-warning/10 text-warning border border-warning/20">
                          {request.leaveCategory.replaceAll('_', ' ')}
                        </span>
                      )}
                      {request.documentName && (
                        <span className="px-2 py-1 rounded-full text-xs bg-success/10 text-success border border-success/20">
                          Document uploaded
                        </span>
                      )}
                      {request.isPaidLeave && (
                        <span className="px-2 py-1 rounded-full text-xs bg-success/10 text-success border border-success/20">
                          Paid Leave
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-2 text-light-text dark:text-dark-text opacity-70 bg-light-bg dark:bg-dark-bg px-3 py-1 rounded-full">
                        <Calendar className="w-4 h-4" />
                        <p className="text-sm">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusStyles(request.status)}`}
                    >
                      {getStatusIcon(request.status)}
                      {request.status}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCurrentLeave(request);
                          setNewStatus(request.status);
                          setUseTemplateQuota(false);
                          setIsSlideOverOpen(true);
                        }}
                        className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded-lg transition-colors group-hover:text-primary"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setLeaveToDelete(request);
                          setDeleteConfirmOpen(true);
                        }}
                        className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded-lg transition-colors group-hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 border-t border-light-border dark:border-dark-border">
            <div className="text-sm text-light-text dark:text-dark-text opacity-70">
              Showing{' '}
              <span className="font-medium text-light-text dark:text-dark-text">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-light-text dark:text-dark-text">
                {Math.min(currentPage * pageSize, totalRequests)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-light-text dark:text-dark-text">
                {totalRequests}
              </span>{' '}
              results
            </div>

            <div className="flex items-center gap-2">
              <div className="mr-4">
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all appearance-none text-light-text dark:text-dark-text"
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                </select>
              </div>

              <button
                onClick={() => fetchLeaves(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${currentPage === 1 ? 'text-light-text dark:text-dark-text opacity-30 cursor-not-allowed' : 'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg hover:text-primary'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNumber}
                    className={`w-8 h-8 flex items-center justify-center rounded-md ${currentPage === pageNumber ? 'bg-primary text-white' : 'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg hover:text-primary'}`}
                    onClick={() => fetchLeaves(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() => fetchLeaves(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${currentPage === totalPages ? 'text-light-text dark:text-dark-text opacity-30 cursor-not-allowed' : 'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg hover:text-primary'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-light-text dark:text-dark-text opacity-70">
          <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No leave requests found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </>
  );

  const renderCreateSection = () => (
    <div className="space-y-6">
      <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border shadow-card">
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-b border-light-border dark:border-dark-border">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard/leaves/assign')}
            className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
          >
            Assign Leaves
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setIsTemplatePanelOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Create New Leave
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-sky-50 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/70 dark:text-dark-text/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Leave Name</th>
                <th className="px-4 py-3 text-left font-semibold">Auto Allocation</th>
                <th className="px-4 py-3 text-left font-semibold">Carry Forward</th>
                <th className="px-4 py-3 text-left font-semibold">Effective Date</th>
                <th className="px-4 py-3 text-left font-semibold">Leave Encashment</th>
                <th className="px-4 py-3 text-left font-semibold">Created On</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {templatesLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-light-text/70 dark:text-dark-text/70"
                  >
                    Loading templates...
                  </td>
                </tr>
              ) : templates.length > 0 ? (
                templates.map(template => (
                  <tr key={template._id} className="text-light-text dark:text-dark-text">
                    <td className="px-4 py-3 font-medium">{template.name}</td>
                    <td className="px-4 py-3">
                      {template.autoAllocationPeriod === 'yearly'
                        ? `Every Calendar Year ${template.autoAllocationCount || 0}`
                        : `Every Month ${template.autoAllocationCount || 0}`}
                    </td>
                    <td className="px-4 py-3">
                      {template.carryForwardPeriod === 'yearly'
                        ? `End Of Every Calendar Year ${template.carryForwardCount || 0}`
                        : `End Of Every Month ${template.carryForwardCount || 0}`}
                    </td>
                    <td className="px-4 py-3">
                      {format(
                        new Date(template.effectiveDate || template.createdAt),
                        'dd MMM yyyy'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {template.encashmentAllowed ? 'Allowed' : 'Not Allowed'}
                    </td>
                    <td className="px-4 py-3">
                      {template.createdAt
                        ? format(new Date(template.createdAt), 'dd MMM yyyy')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplate(template);
                            setIsTemplatePanelOpen(true);
                          }}
                          className="p-2 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(template._id)}
                          className="p-2 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-light-text/70 dark:text-dark-text/70"
                  >
                    No leave templates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <LeaveTemplatePanel
        isOpen={isTemplatePanelOpen}
        onClose={() => setIsTemplatePanelOpen(false)}
        onCreate={createTemplate}
        onUpdate={updateTemplate}
        initialData={editingTemplate}
      />
    </div>
  );

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Leave Management"
          icon={<NotebookTabsIcon className="w-8 h-8 text-primary" />}
          description="Manage employee leave requests and update their statuses."
        />

        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 mb-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tabItem => {
              const isActive = activeTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => setActiveTab(tabItem.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white border-primary'
                      : 'border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg'
                  }`}
                >
                  <span>{tabItem.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'requests' && (
          <>
            <div className="max-w-7xl mx-auto bg-light-card dark:bg-dark-card px-6 -mx-6 py-4 border-b border-light-border dark:border-dark-border rounded-lg p-4 border ">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <form onSubmit={handleSearch} className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text dark:text-dark-text opacity-50 w-4 h-4 group-hover:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder="Search by email or reason..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-64 md:w-72 transition-all placeholder:text-light-text dark:placeholder:text-dark-text placeholder:opacity-50 text-light-text dark:text-dark-text"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-light-card dark:hover:bg-dark-card rounded-md"
                    >
                      <Check className="w-4 h-4 text-primary" />
                    </button>
                  </form>
                  <button
                    onClick={refreshData}
                    className="p-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg hover:border-primary/50 transition-all text-light-text dark:text-dark-text opacity-50 hover:text-primary"
                  >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                    className={`p-2 bg-light-bg dark:bg-dark-bg border rounded-lg transition-all text-light-text dark:text-dark-text opacity-50 hover:text-primary ${isAdvancedFilterOpen ? 'border-primary/50 text-primary' : 'border-light-border dark:border-dark-border'}`}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {isAdvancedFilterOpen && (
              <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-4 my-4 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-light-text dark:text-dark-text opacity-70 mb-2">
                      Status Filter
                    </label>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text dark:text-dark-text opacity-50 w-4 h-4" />
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="pl-10 pr-8 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all appearance-none w-full text-light-text dark:text-dark-text"
                      >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text dark:text-dark-text opacity-50 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-light-text dark:text-dark-text opacity-70 mb-2">
                      Sort Order
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text dark:text-dark-text opacity-50 w-4 h-4" />
                      <select
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value)}
                        className="pl-10 pr-8 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all appearance-none w-full text-light-text dark:text-dark-text"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text dark:text-dark-text opacity-50 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-light-text dark:text-dark-text opacity-70 mb-2">
                      Date Range
                    </label>
                    <div className="relative">
                      <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text dark:text-dark-text opacity-50 w-4 h-4" />
                      <select
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        className="pl-10 pr-8 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all appearance-none w-full text-light-text dark:text-dark-text"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="custom">Custom Range</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text dark:text-dark-text opacity-50 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>

                  {dateFilter === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm text-light-text dark:text-dark-text opacity-70 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          className="w-full px-4 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all text-light-text dark:text-dark-text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-light-text dark:text-dark-text opacity-70 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className="w-full px-4 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all text-light-text dark:text-dark-text"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => fetchLeaves(1)}
                          className="px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-all text-white font-medium text-sm flex items-center gap-2"
                        >
                          <Filter className="w-4 h-4" />
                          Apply Filter
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'requests' ? renderRequestsSection() : renderCreateSection()}
      </div>

      {isSlideOverOpen && currentLeave && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-xl border border-light-border dark:border-dark-border max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Edit className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                  Update Leave Status
                </h3>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70">
                  Change the status of this leave request
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
                  <User className="w-4 h-4" />
                  <span>{currentLeave.employeeEmail}</span>
                </div>
                <p className="mt-2 text-sm text-light-text dark:text-dark-text">
                  {currentLeave.reason}
                </p>
                {currentLeave.leaveCategory && (
                  <p className="mt-2 text-sm text-light-text dark:text-dark-text opacity-70">
                    Category: {currentLeave.leaveCategory.replaceAll('_', ' ')}
                  </p>
                )}
                {currentLeave.documentName && (
                  <div className="mt-3 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-3 text-sm text-light-text dark:text-dark-text">
                    <p className="font-medium">Supporting document</p>
                    <p className="opacity-70 mt-1">{currentLeave.documentName}</p>
                    {currentLeave.documentData?.startsWith('data:') ? (
                      <button
                        type="button"
                        onClick={() => setIsDocumentPreviewOpen(true)}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
                      >
                        Preview
                      </button>
                    ) : (
                      <p className="mt-3 text-xs text-light-text dark:text-dark-text opacity-70">
                        Preview is not available for this file type.
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-3 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-3 text-sm text-light-text dark:text-dark-text">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Assigned leave quota</p>
                    {templateQuotaLoading && <span className="text-xs opacity-70">Loading...</span>}
                  </div>
                  {templateQuota?.template ? (
                    <div className="mt-2 space-y-2">
                      <p className="opacity-70">{templateQuota.template.name}</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-light-bg dark:bg-dark-bg p-2">
                          <p className="text-xs opacity-70">Total</p>
                          <p className="font-semibold">{templateQuota.balance.total}</p>
                        </div>
                        <div className="rounded-lg bg-light-bg dark:bg-dark-bg p-2">
                          <p className="text-xs opacity-70">Used</p>
                          <p className="font-semibold">{templateQuota.balance.used}</p>
                        </div>
                        <div className="rounded-lg bg-success/10 p-2">
                          <p className="text-xs text-success">Remaining</p>
                          <p className="font-semibold text-success">
                            {templateQuota.balance.remaining}
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 mt-2 text-sm text-light-text dark:text-dark-text">
                        <input
                          type="checkbox"
                          checked={useTemplateQuota}
                          onChange={e => setUseTemplateQuota(e.target.checked)}
                          disabled={!templateQuota.balance.remaining}
                          className="h-4 w-4 accent-primary"
                        />
                        Use this quota for the approval
                      </label>
                    </div>
                  ) : (
                    <p className="mt-2 opacity-70">No template quota assigned to this employee.</p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-light-text dark:text-dark-text opacity-70">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDate(currentLeave.startDate)} - {formatDate(currentLeave.endDate)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70 mb-2">
                  Current Status:{' '}
                  <span
                    className={`font-medium ${currentLeave.status === 'approved' ? 'text-success' : currentLeave.status === 'rejected' ? 'text-danger' : 'text-warning'}`}
                  >
                    {currentLeave.status}
                  </span>
                </p>
                <label className="text-sm text-light-text dark:text-dark-text opacity-70 mb-2 block">
                  Update Status
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-primary transition-all text-light-text dark:text-dark-text"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <label className="inline-flex items-center gap-2 mt-3 text-sm text-light-text dark:text-dark-text">
                  <input
                    type="checkbox"
                    checked={newIsPaidLeave}
                    onChange={e => setNewIsPaidLeave(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Count this leave as paid leave
                </label>
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setIsSlideOverOpen(false)}
                className="px-4 py-2 bg-light-bg dark:bg-dark-bg rounded-lg hover:bg-light-card dark:hover:bg-dark-card transition-colors text-light-text dark:text-dark-text"
              >
                Cancel
              </button>
              <button
                onClick={updateLeaveStatus}
                className="px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && leaveToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-xl border border-light-border dark:border-dark-border max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-danger/10 rounded-lg">
                <XCircle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-danger">Delete Leave Request</h3>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70">
                  Are you sure you want to delete this request?
                </p>
              </div>
            </div>

            <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg mb-6">
              <div className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
                <User className="w-4 h-4" />
                <span>{leaveToDelete.employeeEmail}</span>
              </div>
              <p className="mt-2 text-sm text-light-text dark:text-dark-text">
                {leaveToDelete.reason}
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm text-light-text dark:text-dark-text opacity-70">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDate(leaveToDelete.startDate)} - {formatDate(leaveToDelete.endDate)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-light-bg dark:bg-dark-bg rounded-lg hover:bg-light-card dark:hover:bg-dark-card transition-colors text-light-text dark:text-dark-text"
              >
                Cancel
              </button>
              <button
                onClick={deleteLeaveRequest}
                className="px-4 py-2 bg-danger rounded-lg text-white hover:bg-danger/90 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isDocumentPreviewOpen && currentLeave?.documentData?.startsWith('data:') && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-light-border dark:border-dark-border px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                  Document Preview
                </h3>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70">
                  {currentLeave.documentName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDocumentPreviewOpen(false)}
                className="rounded-lg border border-light-border dark:border-dark-border px-3 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(90vh-73px)] overflow-auto bg-black/5 dark:bg-black/20 p-4">
              {currentLeave.documentType?.startsWith('image/') ? (
                <img
                  src={currentLeave.documentData}
                  alt={currentLeave.documentName}
                  className="mx-auto max-h-[78vh] w-auto max-w-full object-contain bg-white rounded-lg"
                />
              ) : currentLeave.documentType === 'application/pdf' ? (
                <iframe
                  src={currentLeave.documentData}
                  title={currentLeave.documentName}
                  className="h-[78vh] w-full rounded-lg bg-white"
                />
              ) : (
                <div className="rounded-lg bg-light-card dark:bg-dark-card p-6 text-sm text-light-text dark:text-dark-text opacity-70">
                  Preview is not available for this file type.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
      />
    </div>
  );
};

const LeaveTemplatePanel = ({ isOpen, onClose, onCreate, onUpdate, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    autoAllocationCount: '',
    autoAllocationPeriod: 'monthly',
    carryForwardCount: '',
    carryForwardPeriod: 'monthly',
    effectiveDate: new Date().toISOString().split('T')[0],
    encashmentAllowed: false,
    requiresDocument: false,
    autoApprove: true,
    countAsPaidLeave: true,
  });

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        autoAllocationCount: initialData.autoAllocationCount ?? '',
        autoAllocationPeriod: initialData.autoAllocationPeriod || 'monthly',
        carryForwardCount: initialData.carryForwardCount ?? '',
        carryForwardPeriod: initialData.carryForwardPeriod || 'monthly',
        effectiveDate: new Date(initialData.effectiveDate || initialData.createdAt || new Date())
          .toISOString()
          .split('T')[0],
        encashmentAllowed: Boolean(initialData.encashmentAllowed),
        requiresDocument: Boolean(initialData.requiresDocument),
        autoApprove:
          initialData.autoApprove === undefined ? true : Boolean(initialData.autoApprove),
        countAsPaidLeave:
          initialData.countAsPaidLeave === undefined ? true : Boolean(initialData.countAsPaidLeave),
      });
    } else {
      setFormData({
        name: '',
        description: '',
        autoAllocationCount: '',
        autoAllocationPeriod: 'monthly',
        carryForwardCount: '',
        carryForwardPeriod: 'monthly',
        effectiveDate: new Date().toISOString().split('T')[0],
        encashmentAllowed: false,
        requiresDocument: false,
        autoApprove: true,
        countAsPaidLeave: true,
      });
    }
  }, [initialData, isOpen]);

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Mount-with-animation pattern (mirrors the payroll snapshot panel in
  // admin/salaries/index.jsx). On open we mount with `visible=false` so the
  // backdrop+panel paint in their off-screen state, then on the next animation
  // frame flip `visible` so the transition actually plays. On close we drop
  // `visible` to play the reverse animation and unmount after 300 ms so the
  // form resets cleanly. Splitting mount and visible across two effects (and
  // a double RAF) guarantees React commits the off-screen frame before the
  // browser paints the visible one.
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    setVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, 300);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!mounted || visible) return undefined;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Leave name is required.');
      return;
    }

    const handler = initialData ? onUpdate : onCreate;
    if (!handler) {
      toast.error('Save handler is not available.');
      return;
    }

    setIsSaving(true);
    const payload = {
      ...formData,
      autoAllocationCount: Number(formData.autoAllocationCount || 0),
      carryForwardCount: Number(formData.carryForwardCount || 0),
    };

    const success = initialData ? await handler(initialData._id, payload) : await handler(payload);
    setIsSaving(false);

    if (success) {
      onClose();
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-light-card dark:bg-dark-card shadow-2xl border-l border-light-border dark:border-dark-border flex flex-col transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={event => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border bg-light-bg/70 dark:bg-dark-bg/70 shrink-0">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            {initialData ? 'Edit Leave Template' : 'Create New Leave'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm text-light-text dark:text-dark-text mb-2">
              Leave Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Sick Leave"
              value={formData.name}
              onChange={event => updateForm('name', event.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-light-text dark:text-dark-text mb-2">
              Description
            </label>
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={event => updateForm('description', event.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-light-text dark:text-dark-text mb-2">
              Effective Date *
            </label>
            <input
              type="date"
              value={formData.effectiveDate}
              onChange={event => updateForm('effectiveDate', event.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-light-text dark:text-dark-text mb-2">
              Number Of Auto Allocation Leaves *
            </label>
            <input
              type="number"
              placeholder="Enter number of leaves"
              value={formData.autoAllocationCount}
              onChange={event => updateForm('autoAllocationCount', event.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-light-text dark:text-dark-text mb-2">
              Auto Allocation *
            </label>
            <div className="flex items-center gap-4 text-sm text-light-text dark:text-dark-text">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="allocation"
                  checked={formData.autoAllocationPeriod === 'monthly'}
                  onChange={() => updateForm('autoAllocationPeriod', 'monthly')}
                />
                Every Month
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="allocation"
                  checked={formData.autoAllocationPeriod === 'yearly'}
                  onChange={() => updateForm('autoAllocationPeriod', 'yearly')}
                />
                Every Calendar Year
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm text-light-text dark:text-dark-text mb-2">
              Carry Forward *
            </label>
            <input
              type="number"
              placeholder="Enter number of leaves"
              value={formData.carryForwardCount}
              onChange={event => updateForm('carryForwardCount', event.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-4 text-sm text-light-text dark:text-dark-text">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="carryForward"
                  checked={formData.carryForwardPeriod === 'monthly'}
                  onChange={() => updateForm('carryForwardPeriod', 'monthly')}
                />
                End Of Every Month
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="carryForward"
                  checked={formData.carryForwardPeriod === 'yearly'}
                  onChange={() => updateForm('carryForwardPeriod', 'yearly')}
                />
                End Of Every Calendar Year
              </label>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
            <input
              type="checkbox"
              checked={formData.encashmentAllowed}
              onChange={event => updateForm('encashmentAllowed', event.target.checked)}
            />
            Convert extra available leaves into cash if they exceed the carry-forward limit.
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
            <input
              type="checkbox"
              checked={formData.autoApprove}
              onChange={event => updateForm('autoApprove', event.target.checked)}
            />
            Auto-approve leave requests created from this template.
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
            <input
              type="checkbox"
              checked={formData.countAsPaidLeave}
              onChange={event => updateForm('countAsPaidLeave', event.target.checked)}
            />
            Count approved leave from this template as paid leave.
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
            <input
              type="checkbox"
              checked={formData.requiresDocument}
              onChange={event => updateForm('requiresDocument', event.target.checked)}
            />
            Require supporting documents for this template.
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-sm"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLeaveManagement;
