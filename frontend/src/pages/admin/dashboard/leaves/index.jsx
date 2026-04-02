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
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const AdminLeaveManagement = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentLeave, setCurrentLeave] = useState(null);
  const [newStatus, setNewStatus] = useState('pending');
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState(null);
  // eslint-disable-next-line no-unused-vars, unused-imports/no-unused-vars
  const [hoveredRequest, setHoveredRequest] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRequests, setTotalRequests] = useState(0);

  // Date filter state
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

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
      setTotalRequests(data.total || 0);
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
        body: JSON.stringify({ status: newStatus }),
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
    if (dateFilter !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  }, [dateFilter]);

  const formatDate = dateString => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return { dateString };
    }
  };

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Leave Management"
          icon={<NotebookTabsIcon className="w-8 h-8 text-primary" />}
          description="Manage employee leave requests and update their statuses."
        />
        {/* Header */}
        <div className="sticky top-0 z-10 bg-light-card dark:bg-dark-card px-6 -mx-6 py-4 border-b border-light-border dark:border-dark-border">
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

        {/* Advanced Filters Panel */}
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

        {/* Stats Summary */}
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

        {/* Leave Requests */}
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

            {/* Pagination */}
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
      </div>

      {/* Edit Status Modal */}
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

      {/* Delete Confirmation Modal */}
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

export default AdminLeaveManagement;
