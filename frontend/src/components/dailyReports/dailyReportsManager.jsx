import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Search,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const DailyReportsManager = ({ employeeId = null, employeeName = '', className = '' }) => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [editedReportText, setEditedReportText] = useState('');
  const [editedAdminComment, setEditedAdminComment] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    employee: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  const authToken = useMemo(() => localStorage.getItem('token'), []);
  const showEmployeeFilter = !employeeId;

  const fetchEmployees = async () => {
    if (!showEmployeeFilter) return;
    try {
      const response = await fetch(`${BASE_URL}/employee/all`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to fetch employees');

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch employees for filter');
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });

      if (appliedFilters.search) queryParams.append('search', appliedFilters.search);
      if (showEmployeeFilter && appliedFilters.employee) {
        queryParams.append('employee', appliedFilters.employee);
      }
      if (appliedFilters.status) queryParams.append('status', appliedFilters.status);
      if (appliedFilters.startDate) queryParams.append('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate) queryParams.append('endDate', appliedFilters.endDate);

      const endpoint = employeeId
        ? `${BASE_URL}/daily-reports/employee/${employeeId}?${queryParams.toString()}`
        : `${BASE_URL}/daily-reports?${queryParams.toString()}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to fetch daily reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalReports(data.pagination?.totalReports || 0);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch daily reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, currentPage, pageSize, appliedFilters]);

  const getReportStatus = report =>
    report.reportText && report.reportText !== 'N/A' ? 'filled' : 'na';

  const formatReportDate = dateValue => {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleDateString();
  };

  const openEditModal = report => {
    setSelectedReport(report);
    setEditedReportText(report.reportText === 'N/A' ? '' : report.reportText || '');
    setEditedAdminComment(report.adminComment || '');
  };

  const closeEditModal = () => {
    setSelectedReport(null);
    setEditedReportText('');
    setEditedAdminComment('');
  };

  const handleSave = async () => {
    if (!selectedReport) return;

    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/daily-reports/admin/${selectedReport._id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report: editedReportText.trim(),
          adminComment: editedAdminComment.trim(),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to update report');
      }

      const data = await response.json();
      const updatedReport = data.dailyReport;

      setReports(prev =>
        prev.map(report => (report._id === updatedReport._id ? updatedReport : report))
      );
      toast.success(data.message || 'Daily report updated successfully');
      closeEditModal();
    } catch (error) {
      toast.error(error.message || 'Failed to update daily report');
    } finally {
      setSaving(false);
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({
      search: searchInput.trim(),
      employee: selectedEmployee,
      status: selectedStatus,
      startDate,
      endDate,
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSelectedEmployee('');
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setAppliedFilters({ search: '', employee: '', status: '', startDate: '', endDate: '' });
  };

  const getEmployeeLabel = report => {
    if (report.employee?.name) return report.employee.name;
    if (employeeName) return employeeName;
    if (typeof report.employee === 'string') return report.employee;
    return 'Unknown Employee';
  };

  return (
    <div
      className={`bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-5">
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-light-text dark:text-dark-text opacity-60" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search report, comment, employee..."
            className="w-full pl-9 pr-3 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text placeholder-light-text dark:placeholder-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {showEmployeeFilter && (
          <div className="md:col-span-2">
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Employees</option>
              {employees.map(employee => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="md:col-span-2">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="filled">Filled</option>
            <option value="na">N/A</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="md:col-span-2">
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="text-sm text-light-text dark:text-dark-text opacity-70">
          Total reports: <span className="font-medium opacity-100">{totalReports}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border hover:bg-light-card dark:hover:bg-dark-card"
          >
            Reset
          </button>
          <button
            onClick={applyFilters}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-light-text dark:text-dark-text">Loading daily reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-light-text dark:text-dark-text opacity-70">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-60" />
          No daily reports found for current filters.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-light-border dark:border-dark-border">
            <table className="w-full text-sm">
              <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-light-text dark:text-dark-text">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 font-medium">Report</th>
                  <th className="text-left px-4 py-3 font-medium">Admin Comment</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {reports.map(report => {
                  const reportStatus = getReportStatus(report);

                  return (
                    <tr
                      key={report._id}
                      onClick={() => openEditModal(report)}
                      className="hover:bg-light-bg/40 dark:hover:bg-dark-bg/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        {formatReportDate(report.reportDate)}
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span>{getEmployeeLabel(report)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text max-w-[260px] truncate">
                        {report.reportText || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text max-w-[260px] truncate">
                        {report.adminComment || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 text-xs rounded-full ${
                            reportStatus === 'filled'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {reportStatus === 'filled' ? 'Filled' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            openEditModal(report);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setCurrentPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="px-2 py-1 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md"
              >
                {PAGE_SIZE_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-md border border-light-border dark:border-dark-border disabled:opacity-40 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-light-text dark:text-dark-text opacity-80">
                Page {currentPage} of {Math.max(totalPages, 1)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.max(totalPages, 1)))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-md border border-light-border dark:border-dark-border disabled:opacity-40 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                Update Daily Report
              </h3>
              <button
                onClick={closeEditModal}
                className="p-1.5 rounded-md hover:bg-light-bg dark:hover:bg-dark-bg text-light-text dark:text-dark-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-light-text dark:text-dark-text mb-2 block">
                  <div className="inline-flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Report Text
                  </div>
                </label>
                <textarea
                  rows={5}
                  maxLength={5000}
                  value={editedReportText}
                  onChange={e => setEditedReportText(e.target.value)}
                  className="w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-light-text dark:text-dark-text mb-2 block">
                  <div className="inline-flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Admin Comment
                  </div>
                </label>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={editedAdminComment}
                  onChange={e => setEditedAdminComment(e.target.value)}
                  className="w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add internal review comment"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-5">
              <button
                onClick={closeEditModal}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReportsManager;
