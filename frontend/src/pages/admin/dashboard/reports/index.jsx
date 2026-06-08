import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Flag,
  ListFilterPlus,
  Watch,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Modal from '../../../../components/Modal';
import Header from '../../../../components/pageHeader';
import { useAuth } from '../../../../context/authContext';

// Tab identifiers — kept as constants to satisfy sonarjs/no-duplicate-string.
const TAB_ATTENDANCE = 'attendance';
const TAB_DAILY_PUNCH = 'daily-punch';
const TAB_DAILY_REPORT = 'daily-report';
const TAB_HOURLY = 'hourly';
const TAB_ATTENDANCE_MASTER = 'attendance-master';

// Common UI strings.
const SHOWING_NO_RESULTS = 'Showing 0 results';

const AnimatedStatusBadge = ({ status, label }) => {
  const statusConfig = {
    'full-day': {
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100/80 dark:bg-green-900/30',
      borderColor: 'border-green-300 dark:border-green-700',
      animation: 'scale-up',
    },
    'half-day': {
      icon: Circle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100/80 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-300 dark:border-yellow-700',
      animation: 'bounce-in',
    },
    leave: {
      icon: Flag,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100/80 dark:bg-blue-900/30',
      borderColor: 'border-blue-300 dark:border-blue-700',
      animation: 'slide-in',
    },
    absent: {
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100/80 dark:bg-red-900/30',
      borderColor: 'border-red-300 dark:border-red-700',
      animation: 'pulse-fade',
    },
    'absent-early-checkout': {
      icon: Clock,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100/80 dark:bg-orange-900/30',
      borderColor: 'border-orange-300 dark:border-orange-700',
      animation: 'rotate-in',
    },
    holiday: {
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100/80 dark:bg-purple-900/30',
      borderColor: 'border-purple-300 dark:border-purple-700',
      animation: 'slide-in',
    },
    'checkout-pending': {
      icon: Watch,
      color: 'text-gray-600 dark:text-gray-400',
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-gray-100/80 dark:bg-gray-900/30',
      borderColor: 'border-gray-300 dark:border-gray-700',
      animation: 'blink',
    },
  };

  // Prefer explicit checkout-pending labels first, then use the backend
  // status so composite labels like "Holiday (Diwali)" still resolve to the
  // correct badge config.
  const normalizedFromLabel = label
    ? label.toLowerCase().replace('(', '').replace(')', '').replace(/\s+/g, '-')
    : null;
  const isCheckoutPendingLabel = normalizedFromLabel === 'checkout-pending';
  const normalizedStatus =
    isCheckoutPendingLabel
      ? 'checkout-pending'
      : status && statusConfig[status]
        ? status
        : normalizedFromLabel && statusConfig[normalizedFromLabel]
          ? normalizedFromLabel
          : normalizedFromLabel && normalizedFromLabel.startsWith('holiday')
            ? 'holiday'
            : status || normalizedFromLabel || 'absent';

  const config = statusConfig[normalizedStatus] || statusConfig['absent'];
  const Icon = config.icon;
  const isCheckoutPending = normalizedStatus === 'checkout-pending';
  const statusText = label || 'Unknown';

  return (
    <>
      <style>{`
        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse-fade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes rotate-in {
          from {
            opacity: 0;
            transform: rotate(-45deg) scale(0.8);
          }
          to {
            opacity: 1;
            transform: rotate(0deg) scale(1);
          }
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.6; }
        }
        .status-badge {
          animation: var(--animation-name) 0.5s ease-out forwards;
        }
      `}</style>
      <div
        className={`status-badge ${isCheckoutPending ? 'flex flex-col items-start gap-0.5' : 'flex items-center gap-1.5'} px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} w-fit`}
        style={{ '--animation-name': config.animation }}
      >
        {isCheckoutPending ? (
          <>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Icon className={`w-4 h-4 ${config.iconColor || config.color} flex-shrink-0`} />
              <span className={`text-sm font-medium ${config.color} leading-none`}>Checkout</span>
            </div>
            <span className={`text-xs font-medium ${config.color} leading-none pl-5`}>Pending</span>
          </>
        ) : (
          <>
            <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
            <span className={`text-sm font-medium ${config.color} whitespace-nowrap leading-none`}>
              {statusText}
            </span>
          </>
        )}
      </div>
    </>
  );
};

const AdminReports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'attendance';
  const employeeParam = searchParams.get('employee') || 'all';
  const attendanceFromParam = searchParams.get('attendanceFrom');
  const attendanceToParam = searchParams.get('attendanceTo');
  const auth = useAuth();
  const adminEmail = auth?.email ?? 'Unknown';
  const [loading, setLoading] = useState(false);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateFilterType, setDateFilterType] = useState('monthly');
  const [particularDate, setParticularDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState(employeeParam);
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [punchRecords, setPunchRecords] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [hourlyRecords, setHourlyRecords] = useState([]);
  const [attendanceMasterRows, setAttendanceMasterRows] = useState([]);
  const [savingAttendanceKey, setSavingAttendanceKey] = useState('');
  const [attendanceLogPanel, setAttendanceLogPanel] = useState(null);
  const [selectedLogEntryKey, setSelectedLogEntryKey] = useState('');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState({
    'full-day': true,
    'half-day': true,
    leave: true,
    absent: true,
    holiday: true,
  });
  const [isLogPanelVisible, setIsLogPanelVisible] = useState(false);
  const [attendanceMasterFromDate, setAttendanceMasterFromDate] = useState(
    () => attendanceFromParam || new Date().toISOString().split('T')[0]
  );
  const [attendanceMasterToDate, setAttendanceMasterToDate] = useState(
    () => attendanceToParam || new Date().toISOString().split('T')[0]
  );
  const attendanceMasterTableScrollRef = useRef(null);
  const attendanceMasterScrollIntervalRef = useRef(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openReportModal, setOpenReportModal] = useState(false);
  const [modalReportId, setModalReportId] = useState('');
  const [modalSubject, setModalSubject] = useState('');
  const [modalBody, setModalBody] = useState('');
  const [modalAdminComment, setModalAdminComment] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [savingCommentId, setSavingCommentId] = useState('');
  const [selectedCheckoutHour, setSelectedCheckoutHour] = useState(18); // Default to 6:00 PM

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  const tabs = [
    { id: TAB_ATTENDANCE, label: 'Attendance' },
    { id: TAB_DAILY_PUNCH, label: 'Daily Punch' },
    { id: TAB_DAILY_REPORT, label: 'Daily Work' },
    { id: TAB_HOURLY, label: 'Hourly' },
    { id: TAB_ATTENDANCE_MASTER, label: 'Attendance Master' },
  ];

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${BASE_URL}/employee/all?limit=200`, {
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
    fetchEmployees();
  }, []);

  // If an employee query param was provided but doesn't match any known
  // employee, fall back to "all" so the page still renders meaningful data.
  useEffect(() => {
    if (filterEmployee === 'all' || employees.length === 0) return;
    const match = employees.some(emp => emp._id === filterEmployee);
    if (!match) {
      setFilterEmployee('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  // Keep the URL's `employee` query param in sync with the active filter so
  // deep links remain shareable and the filter survives tab switches.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filterEmployee && filterEmployee !== 'all') {
      next.set('employee', filterEmployee);
    } else {
      next.delete('employee');
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEmployee]);

  // Fetch data based on active tab
  useEffect(() => {
    if (tab === TAB_ATTENDANCE) {
      fetchAttendanceReport();
    } else if (tab === TAB_DAILY_PUNCH) {
      fetchPunchRecords();
    } else if (tab === TAB_DAILY_REPORT) {
      fetchDailyReports();
    } else if (tab === TAB_HOURLY) {
      fetchHourlyRecords();
    } else if (tab === TAB_ATTENDANCE_MASTER) {
      fetchAttendanceMaster();
    }
  }, [
    tab,
    selectedMonth,
    selectedYear,
    filterEmployee,
    dateFilterType,
    particularDate,
    customStartDate,
    customEndDate,
    attendanceMasterFromDate,
    attendanceMasterToDate,
  ]);

  const formatDateInput = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRangeForQuery = () => {
    if (dateFilterType === 'particular' && particularDate) {
      return { startDate: particularDate, endDate: particularDate };
    }
    if (dateFilterType === 'custom' && customStartDate && customEndDate) {
      if (customStartDate <= customEndDate) {
        return { startDate: customStartDate, endDate: customEndDate };
      }
      return { startDate: customEndDate, endDate: customStartDate };
    }
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0);
    // For monthly mode, cap endDate to today (don't show future dates)
    const today = new Date();
    const cappedEnd = monthEnd > today ? today : monthEnd;
    return {
      startDate: formatDateInput(monthStart),
      endDate: formatDateInput(cappedEnd),
    };
  };

  const isRecordWithinRange = (recordDate, startDate, endDate) => {
    if (!recordDate || !startDate || !endDate) return false;
    const day = formatDateInput(new Date(recordDate));
    return day >= startDate && day <= endDate;
  };

  const getEmployeeMeta = employeeId => {
    if (!employeeId) return null;
    return employees.find(emp => emp._id === employeeId) || null;
  };

  const normalizeAttendanceRecord = (record, employeeIdFromFilter = '') => {
    const employeeId = record.employeeId || employeeIdFromFilter;
    const fallback = getEmployeeMeta(employeeId);
    // Map full-day to present for display
    const displayStatus = status => {
      if (status === 'full-day') return 'present';
      return status || (record.halfDay ? 'half-day' : 'present');
    };
    return {
      _id: record._id,
      employeeId,
      employeeName: record.employeeName || record.employee?.name || fallback?.name || '',
      employeeCode:
        record.employeeCode || record.employee?.employeeCode || fallback?.employeeCode || '',
      date: record.date,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: displayStatus(record.status),
      statusLabel: record.statusLabel || '',
      actualHours:
        record.actualHours !== undefined
          ? Number(record.actualHours)
          : Number(((record.totalWorkingTime || record.totalWorkTime || 0) / 60).toFixed(2)),
      totalWorkingTime: record.totalWorkingTime || record.totalWorkTime || 0,
      totalRecessDuration: record.totalRecessDuration || 0,
    };
  };

  const fetchAttendanceByDateMode = async () => {
    const { startDate, endDate } = getDateRangeForQuery();
    if (!startDate || !endDate) return [];

    // Use attendance-master endpoint to get same data as Attendance Master tab
    const params = new URLSearchParams({ startDate, endDate });
    if (filterEmployee !== 'all' && filterEmployee) {
      params.set('employeeId', filterEmployee);
    }

    try {
      const response = await fetch(`${BASE_URL}/reports/attendance-master?${params.toString()}`, {
        headers: authHeaders,
      });
      if (!response.ok) return [];
      const data = await response.json();
      const rows = data.rows || [];

      return rows
        .map(record =>
          normalizeAttendanceRecord(
            {
              ...record,
              employeeId: record.employeeId,
              employeeCode: record.employeeCode || '',
              status: record.status, // Use status from attendance-master directly
              totalWorkingTime: record.totalWorkingTime || 0,
              actualHours: Number(((record.totalWorkingTime || 0) / 60).toFixed(2)),
            },
            filterEmployee === 'all' ? '' : filterEmployee
          )
        )
        .filter(record => (filterEmployee === 'all' ? true : record.employeeId === filterEmployee));
    } catch (error) {
      console.error('Error fetching attendance by date mode:', error);
      return [];
    }
  };

  const fetchAttendanceReport = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceByDateMode();
      setAttendanceReport(data);
    } catch (error) {
      console.error('Error fetching attendance report:', error);
      toast.error('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  const fetchPunchRecords = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceByDateMode();
      setPunchRecords(data);
    } catch (error) {
      console.error('Error fetching punch records:', error);
      toast.error('Failed to load punch records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyReports = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRangeForQuery();
      const params = new URLSearchParams({
        startDate,
        endDate,
        page: '1',
        limit: '100',
      });
      if (filterEmployee !== 'all') {
        params.set('employee', filterEmployee);
      }

      const response = await fetch(`${BASE_URL}/daily-reports?${params.toString()}`, {
        headers: authHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        const reports = data.reports || [];
        setDailyReports(reports);
        setCommentDrafts(
          reports.reduce((acc, report) => {
            acc[report._id] = report.adminComment || '';
            return acc;
          }, {})
        );
      }
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      toast.error('Failed to load daily reports');
    } finally {
      setLoading(false);
    }
  };

  const updateAdminComment = async reportId => {
    try {
      setSavingCommentId(reportId);
      const response = await fetch(`${BASE_URL}/daily-reports/admin/${reportId}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminComment: commentDrafts[reportId] || '',
        }),
      });

      if (!response.ok) throw new Error('Failed to update admin comment');

      const data = await response.json();
      const updated = data.dailyReport;
      setDailyReports(prev =>
        prev.map(report =>
          report._id === reportId ? { ...report, adminComment: updated.adminComment } : report
        )
      );
      toast.success('Admin comment updated');
    } catch (error) {
      console.error('Error updating admin comment:', error);
      toast.error(error.message || 'Failed to update admin comment');
    } finally {
      setSavingCommentId('');
    }
  };

  const openReport = record => {
    setModalReportId(record._id);
    // parse subject if present
    const text = record.reportText || '';
    if (text.startsWith('Subject:')) {
      const parts = text.split(/\n\n/);
      const subjectLine = parts.shift() || '';
      const parsedSubject = subjectLine.replace(/^Subject:\s*/i, '').trim();
      const parsedBody = parts.join('\n\n').trim();
      setModalSubject(parsedSubject);
      setModalBody(parsedBody);
    } else {
      setModalSubject('');
      setModalBody(text === 'N/A' ? '' : text);
    }
    setModalAdminComment(record.adminComment || '');
    // Defer opening modal to avoid immediate backdrop click (same-click close)
    setTimeout(() => setOpenReportModal(true), 0);
  };

  const saveReportAsAdmin = async () => {
    try {
      setModalSaving(true);
      const response = await fetch(`${BASE_URL}/daily-reports/admin/${modalReportId}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminComment: modalAdminComment }),
      });

      if (!response.ok) throw new Error('Failed to update report');

      const data = await response.json();
      const updated = data.dailyReport;
      setDailyReports(prev => prev.map(r => (r._id === updated._id ? updated : r)));
      setCommentDrafts(prev => ({ ...prev, [updated._id]: updated.adminComment || '' }));
      toast.success('Admin comment updated');
      setOpenReportModal(false);
    } catch (error) {
      console.error('Error saving report as admin:', error);
      toast.error(error.message || 'Failed to update report');
    } finally {
      setModalSaving(false);
    }
  };

  const fetchHourlyRecords = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceByDateMode();
      setHourlyRecords(data);
    } catch (error) {
      console.error('Error fetching hourly records:', error);
      toast.error('Failed to load hourly report');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceMaster = async () => {
    setLoading(true);
    try {
      const startDate = attendanceMasterFromDate;
      const endDate = attendanceMasterToDate;
      const params = new URLSearchParams({ startDate, endDate });
      if (filterEmployee !== 'all') params.set('employeeId', filterEmployee);
      const response = await fetch(`${BASE_URL}/reports/attendance-master?${params.toString()}`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error('Failed to fetch attendance master');
      const data = await response.json();
      setAttendanceMasterRows(data.rows || []);
      setStatusFilters({
        'full-day': true,
        'half-day': true,
        leave: true,
        absent: true,
        holiday: true,
      });
      setStatusFilterOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to load attendance master');
    } finally {
      setLoading(false);
    }
  };
  // Listen for cross-tab attendance updates and refresh the attendance master list
  useEffect(() => {
    const onStorage = e => {
      if (e.key === 'attendanceUpdated') {
        // refresh if user is viewing the attendance master tab
        if (tab === TAB_ATTENDANCE_MASTER) fetchAttendanceMaster();
      }
    };
    const onEvent = () => {
      if (tab === TAB_ATTENDANCE_MASTER) fetchAttendanceMaster();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('attendanceUpdated', onEvent);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('attendanceUpdated', onEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, attendanceMasterFromDate, attendanceMasterToDate, filterEmployee]);
  useEffect(() => {
    if (attendanceLogPanel) {
      const id = setTimeout(() => setIsLogPanelVisible(true), 10);
      return () => clearTimeout(id);
    }
    setIsLogPanelVisible(false);
    return undefined;
  }, [attendanceLogPanel]);

  const updateAttendanceMasterStatus = async (row, status) => {
    if (!row?.canEdit) {
      toast.error('Payroll already processed for this month. Changes are not allowed.');
      return;
    }
    const key = `${row.employeeId}_${row.date}`;
    setSavingAttendanceKey(key);
    try {
      const response = await fetch(`${BASE_URL}/reports/attendance-master/status`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: row.employeeId, date: row.date, status }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update status');
      }
      setAttendanceMasterRows(prev =>
        prev.map(item =>
          item.employeeId === row.employeeId && item.date === row.date ? { ...item, status } : item
        )
      );
      // Keep report tabs in sync after attendance master edits
      fetchAttendanceReport();
      fetchPunchRecords();
      fetchHourlyRecords();
      // Notify other views (like Attendance dashboard) to refresh for this date
      try {
        window.dispatchEvent(
          new CustomEvent('attendanceUpdated', {
            detail: { date: row.date, employeeId: row.employeeId },
          })
        );
      } catch (e) {
        // ignore in non-browser environments
      }
      try {
        localStorage.setItem(
          'attendanceUpdated',
          JSON.stringify({ ts: Date.now(), date: row.date, employeeId: row.employeeId })
        );
      } catch (e) {
        // ignore
      }
      toast.success('Attendance status updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setSavingAttendanceKey('');
    }
  };

  const updateAttendanceMasterCheckout = async (row, checkoutHour) => {
    if (!row?.canEdit) {
      toast.error('Payroll already processed for this month. Changes are not allowed.');
      return;
    }
    const key = `${row.employeeId}_${row.date}`;
    setSavingAttendanceKey(key);
    try {
      const response = await fetch(`${BASE_URL}/reports/attendance-master/checkout`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: row.employeeId, date: row.date, checkoutHour }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update checkout time');
      }
      // Refresh attendance master rows
      fetchAttendanceMaster();
      // Notify other views (like Attendance dashboard) to refresh for this date
      try {
        window.dispatchEvent(
          new CustomEvent('attendanceUpdated', {
            detail: { date: row.date, employeeId: row.employeeId },
          })
        );
      } catch (e) {
        // ignore in non-browser environments
      }
      try {
        localStorage.setItem(
          'attendanceUpdated',
          JSON.stringify({ ts: Date.now(), date: row.date, employeeId: row.employeeId })
        );
      } catch (e) {
        // ignore
      }
      toast.success(`Checkout time set to ${checkoutHour}:00`);
    } catch (error) {
      toast.error(error.message || 'Failed to update checkout time');
    } finally {
      setSavingAttendanceKey('');
    }
  };

  const formatStatusLabel = value => {
    if (value === 'present') return 'Present';
    if (value === 'full-day') return 'Full Day';
    if (value === 'half-day') return 'Half Day';
    if (value === 'leave') return 'Leave';
    if (value === 'holiday') return 'Holiday';
    return 'Absent';
  };

  const stopAttendanceMasterAutoScroll = () => {
    if (attendanceMasterScrollIntervalRef.current) {
      clearInterval(attendanceMasterScrollIntervalRef.current);
      attendanceMasterScrollIntervalRef.current = null;
    }
  };

  const startAttendanceMasterAutoScroll = direction => {
    if (!attendanceMasterTableScrollRef.current) return;
    stopAttendanceMasterAutoScroll();
    const step = direction === 'left' ? -18 : 18;
    attendanceMasterScrollIntervalRef.current = setInterval(() => {
      attendanceMasterTableScrollRef.current?.scrollBy({ left: step, behavior: 'auto' });
    }, 16);
  };

  useEffect(() => () => stopAttendanceMasterAutoScroll(), []);

  const formatHoursFromMinutes = minutes => {
    const mins = Number(minutes || 0);
    if (!mins) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };
  const formatHoursFromMs = ms => {
    const mins = Math.floor(Number(ms || 0) / 60000);
    return formatHoursFromMinutes(mins);
  };
  const groupedAttendanceRows = useMemo(() => {
    const grouped = new Map();
    attendanceMasterRows.forEach(row => {
      const key = row.employeeId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });
    grouped.forEach(list => list.sort((a, b) => a.date.localeCompare(b.date)));
    return grouped;
  }, [attendanceMasterRows]);
  const filteredAttendanceMasterRows = useMemo(() => {
    return (attendanceMasterRows || []).filter(row => statusFilters[row.status] !== false);
  }, [attendanceMasterRows, statusFilters]);

  const filteredAttendanceData = useMemo(() => {
    if (filterEmployee === 'all') return attendanceReport;
    return attendanceReport.filter(item => item.employeeId === filterEmployee);
  }, [attendanceReport, filterEmployee]);

  const filteredPunchData = useMemo(() => {
    if (filterEmployee === 'all') return punchRecords;
    return punchRecords.filter(item => item.employeeId === filterEmployee);
  }, [punchRecords, filterEmployee]);

  const filteredReportData = useMemo(() => {
    if (filterEmployee === 'all') return dailyReports;
    return dailyReports.filter(item => {
      const id = item?.employee?._id || item?.employeeId;
      return id === filterEmployee;
    });
  }, [dailyReports, filterEmployee]);

  const filteredHourlyData = useMemo(() => {
    if (filterEmployee === 'all') return hourlyRecords;
    return hourlyRecords.filter(item => item.employeeId === filterEmployee);
  }, [hourlyRecords, filterEmployee]);

  const RECORDS_PER_PAGE = 15;
  const activeDataCount =
    tab === TAB_ATTENDANCE
      ? filteredAttendanceData.length
      : tab === TAB_DAILY_PUNCH
        ? filteredPunchData.length
        : tab === TAB_DAILY_REPORT
          ? filteredReportData.length
          : tab === TAB_HOURLY
            ? filteredHourlyData.length
            : tab === TAB_ATTENDANCE_MASTER
              ? filteredAttendanceMasterRows.length
              : 0;
  const totalPages = Math.max(1, Math.ceil(activeDataCount / RECORDS_PER_PAGE));
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;

  const pagedAttendanceData = useMemo(
    () => filteredAttendanceData.slice(startIndex, startIndex + RECORDS_PER_PAGE),
    [filteredAttendanceData, startIndex]
  );

  const pagedPunchData = useMemo(
    () => filteredPunchData.slice(startIndex, startIndex + RECORDS_PER_PAGE),
    [filteredPunchData, startIndex]
  );

  const pagedReportData = useMemo(
    () => filteredReportData.slice(startIndex, startIndex + RECORDS_PER_PAGE),
    [filteredReportData, startIndex]
  );

  const pagedHourlyData = useMemo(
    () => filteredHourlyData.slice(startIndex, startIndex + RECORDS_PER_PAGE),
    [filteredHourlyData, startIndex]
  );

  const pagedAttendanceMasterRows = useMemo(
    () => filteredAttendanceMasterRows.slice(startIndex, startIndex + RECORDS_PER_PAGE),
    [filteredAttendanceMasterRows, startIndex]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    tab,
    selectedMonth,
    selectedYear,
    filterEmployee,
    dateFilterType,
    particularDate,
    customStartDate,
    customEndDate,
    attendanceMasterFromDate,
    attendanceMasterToDate,
    statusFilters,
  ]);

  useEffect(() => {
    setCurrentPage(prev => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleTabChange = newTab => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', newTab);
    setSearchParams(next);
  };

  // ----------------------------------------------------------------------------------
  // Per-tab PDF column maps + TAB_PDF_CONFIG
  // Each `render(row)` returns an HTML-safe string built from the existing in-file IST
  // formatters. Missing values fall back to the em-dash placeholder; raw status codes
  // (e.g. 'full-day', 'half-day') and ISO timestamps must never leak into the output.
  // The `summary` slot below is wired in Task 3.
  // ----------------------------------------------------------------------------------
  const PDF_EMPTY_PLACEHOLDER = '—';

  const renderAttendanceStatus = record => {
    if (record?.statusLabel) return record.statusLabel;
    if (record?.status) return formatStatusLabel(record.status);
    return PDF_EMPTY_PLACEHOLDER;
  };

  const renderReportText = record => {
    const raw = record?.reportText;
    if (!raw || raw === 'N/A') return PDF_EMPTY_PLACEHOLDER;
    const trimmed = String(raw).trim();
    if (!trimmed) return PDF_EMPTY_PLACEHOLDER;
    return trimmed.length > 280 ? `${trimmed.slice(0, 277)}...` : trimmed;
  };

  const ATTENDANCE_PDF_COLUMNS = [
    { header: 'Employee', render: record => record?.employeeName || PDF_EMPTY_PLACEHOLDER },
    { header: 'Emp Code', render: record => record?.employeeCode || PDF_EMPTY_PLACEHOLDER },
    { header: 'Date', render: record => formatDate(record?.date) },
    { header: 'Check In', render: record => formatTime(record?.checkInTime) },
    { header: 'Check Out', render: record => formatTime(record?.checkOutTime) },
    {
      header: 'Break',
      render: record => formatDurationFromMilliseconds(record?.totalRecessDuration),
    },
    { header: 'Gross Span', render: record => getGrossSpan(record) },
    { header: 'Net Hours', render: record => formatHoursDecimal(record?.actualHours) },
    { header: 'Status', render: renderAttendanceStatus },
  ];

  const PUNCH_PDF_COLUMNS = [
    { header: 'Employee', render: record => record?.employeeName || PDF_EMPTY_PLACEHOLDER },
    { header: 'Emp Code', render: record => record?.employeeCode || PDF_EMPTY_PLACEHOLDER },
    { header: 'Date', render: record => formatDate(record?.date) },
    { header: 'Check-In', render: record => formatTime(record?.checkInTime) },
    { header: 'Check-Out', render: record => formatTime(record?.checkOutTime) },
    {
      header: 'Break',
      render: record => formatDurationFromMilliseconds(record?.totalRecessDuration),
    },
    { header: 'Duration', render: record => formatHoursDecimal(record?.actualHours) },
    {
      header: 'Punch Status',
      render: record => (record?.checkInTime && record?.checkOutTime ? 'Complete' : 'Pending'),
    },
  ];

  const REPORT_PDF_COLUMNS = [
    {
      header: 'Employee',
      render: record => record?.employee?.name || record?.employeeName || PDF_EMPTY_PLACEHOLDER,
    },
    { header: 'Date', render: record => formatDate(record?.reportDate || record?.date) },
    { header: 'Report', render: renderReportText },
    {
      header: 'Admin Comment',
      render: record =>
        record?.adminComment ? String(record.adminComment) : PDF_EMPTY_PLACEHOLDER,
    },
    {
      header: 'Status',
      render: record =>
        record?.reportText && record.reportText !== 'N/A' ? 'Submitted' : 'Pending',
    },
  ];

  const HOURLY_PDF_COLUMNS = [
    { header: 'Employee', render: record => record?.employeeName || PDF_EMPTY_PLACEHOLDER },
    { header: 'Date', render: record => formatDate(record?.date) },
    { header: 'Check-In Hour', render: record => getCheckInHourBucket(record?.checkInTime) },
    { header: 'Check-In', render: record => formatTime(record?.checkInTime) },
    { header: 'Check-Out', render: record => formatTime(record?.checkOutTime) },
    {
      header: 'Break',
      render: record => formatDurationFromMilliseconds(record?.totalRecessDuration),
    },
    { header: 'Net Hours', render: record => formatHoursDecimal(record?.actualHours) },
    {
      header: 'Status',
      render: record => (record?.checkInTime && record?.checkOutTime ? 'Complete' : 'Incomplete'),
    },
  ];

  // ----------------------------------------------------------------------------------
  // Per-tab summary calculators
  // Each calculator consumes the already-filtered slice plus the resolved
  // { startDate, endDate } range and returns { cards: [{ label, value }] }. All
  // math is in-memory; no fetches are issued. Empty slices still produce the
  // full card set, falling back to `0` or `'—'` (or `'0h 0m'` for the
  // attendance Avg Hours card, per the design pseudocode).
  // ----------------------------------------------------------------------------------

  // Returns a YYYY-MM-DD key from any date-like input, using local (IST) wall
  // clock so it matches `r.date` strings already produced by the backend.
  const toPdfDayKey = value => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const summarizeAttendance = (rows /* , range */) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;
    let holiday = 0;
    safeRows.forEach(record => {
      const status = record?.status;
      if (status === 'present' || status === 'full-day') present += 1;
      else if (status === 'absent') absent += 1;
      else if (status === 'half-day') halfDay += 1;
      else if (status === 'leave') leave += 1;
      else if (status === 'holiday') holiday += 1;
    });
    return {
      cards: [
        { label: 'Present', value: present },
        { label: 'Absent', value: absent },
        { label: 'Half Day', value: halfDay },
        { label: 'Leave', value: leave },
        { label: 'Holiday', value: holiday },
      ],
    };
  };

  const summarizePunch = (rows /* , range */) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const totalPunches = safeRows.length;
    const uniqueEmployees = new Set(safeRows.map(record => record?.employeeId).filter(Boolean))
      .size;
    const ON_TIME_HOUR = 10;
    let onTime = 0;
    let late = 0;
    const firstInMinutes = [];
    safeRows.forEach(record => {
      if (!record?.checkInTime) return;
      const stamp = new Date(record.checkInTime);
      if (Number.isNaN(stamp.getTime())) return;
      const hour = stamp.getHours();
      if (hour < ON_TIME_HOUR) onTime += 1;
      else late += 1;
      firstInMinutes.push(hour * 60 + stamp.getMinutes());
    });
    let avgFirstIn = '—';
    if (firstInMinutes.length) {
      const avg = Math.round(
        firstInMinutes.reduce((sum, value) => sum + value, 0) / firstInMinutes.length
      );
      const base = new Date();
      base.setHours(Math.floor(avg / 60), avg % 60, 0, 0);
      avgFirstIn = formatTime(base);
    }
    return {
      cards: [
        { label: 'Total Punches', value: totalPunches },
        { label: 'Unique Employees', value: uniqueEmployees },
        { label: 'On-time', value: onTime },
        { label: 'Late', value: late },
        { label: 'Avg First-In Time', value: avgFirstIn },
      ],
    };
  };

  const summarizeDailyReport = (rows /* , range */) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const total = safeRows.length;
    let submitted = 0;
    let pendingComment = 0;
    safeRows.forEach(record => {
      if (record?.reportText && record.reportText !== 'N/A') submitted += 1;
      const comment = record?.adminComment;
      if (!comment || String(comment).trim() === '') pendingComment += 1;
    });
    return {
      cards: [
        { label: 'Total Reports', value: total },
        { label: 'Submitted', value: submitted },
        { label: 'Pending Admin Comment', value: pendingComment },
      ],
    };
  };

  const summarizeHourly = (rows, range) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const totalHours = safeRows.reduce(
      (sum, record) => sum + (Number(record?.actualHours) || 0),
      0
    );
    const hoursByDay = new Map();
    const punchDays = new Set();
    safeRows.forEach(record => {
      const key = toPdfDayKey(record?.date);
      if (!key) return;
      hoursByDay.set(key, (hoursByDay.get(key) || 0) + (Number(record?.actualHours) || 0));
      if (record?.checkInTime) punchDays.add(key);
    });
    const maxInDay = hoursByDay.size ? Math.max(...hoursByDay.values()) : 0;

    let daysWithNoPunch = 0;
    if (range?.startDate && range?.endDate) {
      const start = new Date(`${range.startDate}T00:00:00`);
      const end = new Date(`${range.endDate}T00:00:00`);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
        const cursor = new Date(start);
        while (cursor <= end) {
          const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
          if (!punchDays.has(key)) daysWithNoPunch += 1;
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }

    return {
      cards: [
        { label: 'Total Hours', value: formatHoursDecimal(totalHours) },
        { label: 'Max Hours in a Day', value: formatHoursDecimal(maxInDay) },
        { label: 'Days With No Punch', value: daysWithNoPunch },
      ],
    };
  };

  // Per-tab knobs consumed by the rebuilt PDF branch. The `summary` slot points
  // at the matching calculator function (NOT the result of calling it).
  const TAB_PDF_CONFIG = {
    attendance: {
      title: 'Attendance Report',
      filenameTab: 'attendance',
      orientation: 'portrait',
      columns: ATTENDANCE_PDF_COLUMNS,
      summary: summarizeAttendance,
    },
    'daily-punch': {
      title: 'Daily Punch Report',
      filenameTab: 'daily-punch',
      orientation: 'landscape',
      columns: PUNCH_PDF_COLUMNS,
      summary: summarizePunch,
    },
    'daily-report': {
      title: 'Daily Work Report',
      filenameTab: 'daily-work',
      orientation: 'portrait',
      columns: REPORT_PDF_COLUMNS,
      summary: summarizeDailyReport,
    },
    hourly: {
      title: 'Hourly Report',
      filenameTab: 'hourly',
      orientation: 'landscape',
      columns: HOURLY_PDF_COLUMNS,
      summary: summarizeHourly,
    },
  };

  // ----------------------------------------------------------------------------------
  // resolveFilterContext
  // Pure helper that turns the active date-filter mode plus any tab-specific
  // filters into a single human-readable string for the PDF "Filter Context"
  // line. Per Requirements 3.2–3.6 and the design example, the date portion is
  // one of:
  //   - 'Monthly <Mon> <YYYY>'                                  (monthly mode)
  //   - 'Particular date: <formatDate(particularDate)>'         (particular)
  //   - 'Custom range: <formatDate(start)> to <formatDate(end)>' (custom)
  // Any extra keys passed via the rest object are appended as comma-separated
  // 'Label: Value' pairs, skipping null/undefined/empty/'all' values. Known
  // keys map to friendly labels via PDF_FILTER_LABELS; unknown keys fall back
  // to a title-cased rendering of the key. No state mutation, no DOM access,
  // no fetches — safe to call from anywhere in the component.
  // ----------------------------------------------------------------------------------
  const PDF_FILTER_LABELS = {
    statusFilter: 'Status',
  };

  const titleCasePdfFilterKey = key =>
    String(key || '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());

  const resolveFilterContext = ({
    // `tab` is part of the documented signature so call sites stay stable even
    // when the helper does not branch on it today; prefixed with `_` to opt
    // out of unused-vars warnings.
    tab: _tab,
    dateFilterType,
    selectedMonth,
    selectedYear,
    particularDate,
    customStartDate,
    customEndDate,
    ...activeFilters
  }) => {
    let base;
    if (dateFilterType === 'particular') {
      base = `Particular date: ${formatDate(particularDate)}`;
    } else if (dateFilterType === 'custom') {
      base = `Custom range: ${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;
    } else {
      // Default to monthly. `selectedMonth` is 1-based throughout this file
      // (initialized as `new Date().getMonth() + 1`).
      const monthIndex = Number(selectedMonth) - 1;
      const year = Number(selectedYear);
      let monthName = '';
      if (monthIndex >= 0 && monthIndex <= 11 && Number.isFinite(year)) {
        monthName = new Date(year, monthIndex, 1).toLocaleDateString('en-IN', {
          month: 'short',
        });
      }
      base = monthName ? `Monthly ${monthName} ${year}` : 'Monthly';
    }

    const extras = Object.entries(activeFilters)
      .filter(
        ([, value]) => value !== null && value !== undefined && value !== '' && value !== 'all'
      )
      .map(([key, value]) => {
        const label = PDF_FILTER_LABELS[key] || titleCasePdfFilterKey(key);
        return `${label}: ${value}`;
      });

    return extras.length ? `${base}, ${extras.join(', ')}` : base;
  };

  // ----------------------------------------------------------------------------------
  // resolveSubject + formatSubjectLine
  // Pure helpers that turn the active `filterEmployee` value into the data /
  // line shown in the PDF "Report Subject" panel. Resolution goes entirely
  // through the in-memory `getEmployeeMeta` lookup against the `employees`
  // array — no network calls (Requirement 4.5).
  //
  //   resolveSubject('all', meta)    -> { kind: 'all' }
  //   resolveSubject('<id>', meta)   -> { kind: 'one', name, code, email }   when found
  //   resolveSubject('<id>', meta)   -> { kind: 'unknown', rawId: '<id>' }   when not found
  //
  // Individually missing fields on a found employee fall back to the shared
  // `PDF_EMPTY_PLACEHOLDER`, so consumers always receive a string.
  //
  // formatSubjectLine renders the resolved object into the line shown in the
  // Subject Panel, using an em-dash (U+2014) per Requirement 4.2:
  //   { kind: 'all' }                    -> 'All Employees'
  //   { kind: 'one', name, code, email } -> 'Jane Doe (EMP042) — jane@acme.com'
  //   { kind: 'unknown', rawId }         -> 'Unknown Employee — <rawId>'
  // Missing pieces are dropped cleanly so the line never contains an empty
  // parenthetical or a dangling em-dash.
  // ----------------------------------------------------------------------------------
  const resolveSubject = (filterEmployeeId, lookup) => {
    if (!filterEmployeeId || filterEmployeeId === 'all') {
      return { kind: 'all' };
    }
    const meta = typeof lookup === 'function' ? lookup(filterEmployeeId) : null;
    if (!meta) {
      return { kind: 'unknown', rawId: filterEmployeeId };
    }
    return {
      kind: 'one',
      name: meta.name || PDF_EMPTY_PLACEHOLDER,
      code: meta.employeeCode || PDF_EMPTY_PLACEHOLDER,
      email: meta.email || PDF_EMPTY_PLACEHOLDER,
    };
  };

  const formatSubjectLine = subject => {
    if (!subject || subject.kind === 'all') {
      return 'All Employees';
    }
    if (subject.kind === 'unknown') {
      return `Unknown Employee \u2014 ${subject.rawId}`;
    }
    // kind === 'one' — drop pieces that are missing or fell back to the placeholder.
    const hasValue = value =>
      typeof value === 'string' && value.trim() !== '' && value !== PDF_EMPTY_PLACEHOLDER;
    const namePart = hasValue(subject.name) ? subject.name : '';
    const codePart = hasValue(subject.code) ? `(${subject.code})` : '';
    const emailPart = hasValue(subject.email) ? subject.email : '';

    const head = [namePart, codePart].filter(Boolean).join(' ');
    if (head && emailPart) return `${head} \u2014 ${emailPart}`;
    if (head) return head;
    if (emailPart) return emailPart;
    return PDF_EMPTY_PLACEHOLDER;
  };

  // ----------------------------------------------------------------------------------
  // printHtmlTemplate
  // Routes a fully-rendered print template through the existing popup flow,
  // falling back to a hidden iframe when the popup is blocked. Mirrors the
  // pseudocode in design.md → "Pop-up-Blocker Fallback":
  //   1. window.open('', '_blank') inside try/catch; if non-null, write the
  //      html, focus, and call popup.print().
  //   2. Otherwise create a hidden, aria-hidden, zero-size, fixed-position
  //      iframe, attach to <body>, set srcdoc = html, and on load call
  //      contentWindow.focus(); contentWindow.print().
  //   3. Cleanup is idempotent — afterprint, a 60-second setTimeout, and any
  //      error path all funnel through the same `cleanup()` and double-removal
  //      is guarded.
  //   4. If both popup and iframe fail to initialize, surface a toast and
  //      return without throwing.
  // Reuses the `toast` helper already imported at the top of this file; no new
  // imports, no new dependencies.
  // ----------------------------------------------------------------------------------
  const printHtmlTemplate = html => {
    // 1. Popup path.
    let popup = null;
    try {
      popup = window.open('', '_blank');
    } catch {
      popup = null;
    }
    if (popup) {
      try {
        popup.document.open();
        popup.document.write(html);
        popup.document.close();
        popup.focus();
        popup.print();
      } catch {
        // Swallow errors from a partially-initialized popup; nothing else to
        // try at this point and we must not throw from the click handler.
      }
      return;
    }

    // 2. Hidden-iframe fallback.
    try {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(frame);

      // Idempotent cleanup — guards against double-removal from the trio of
      // afterprint / setTimeout / error paths below.
      let removed = false;
      const cleanup = () => {
        if (removed) return;
        removed = true;
        try {
          if (frame.parentNode) {
            frame.parentNode.removeChild(frame);
          }
        } catch {
          // Ignore — the node may already be detached.
        }
      };

      frame.srcdoc = html;
      frame.onload = () => {
        const cw = frame.contentWindow;
        if (!cw) {
          cleanup();
          toast.error('Unable to open print surface for PDF export');
          return;
        }
        try {
          cw.focus();
          cw.print();
          const onAfter = () => {
            cleanup();
            try {
              cw.removeEventListener('afterprint', onAfter);
            } catch {
              // Ignore — contentWindow may already be torn down.
            }
          };
          try {
            cw.addEventListener('afterprint', onAfter);
          } catch {
            // Ignore — fall back to the timeout safety net.
          }
          setTimeout(cleanup, 60000);
        } catch {
          cleanup();
          toast.error('Unable to open print surface for PDF export');
        }
      };
    } catch {
      toast.error('Unable to open print surface for PDF export');
    }
  };

  // ----------------------------------------------------------------------------------
  // buildPdfFilename
  // ----------------------------------------------------------------------------------
  // Pure helper that constructs the suggested PDF filename for the print
  // template and download surface. Implements the construction described in
  // `design.md` -> "Filename Construction":
  //
  //   <tabName>[-<empCode>]-<suffix>.pdf
  //
  // Where:
  //   - tabName  = TAB_PDF_CONFIG[tab].filenameTab
  //                ('attendance' | 'daily-punch' | 'daily-work' | 'hourly').
  //   - empCode  = getEmployeeMeta(filterEmployee)?.employeeCode when
  //                filterEmployee !== 'all' AND the lookup returns a record
  //                with a non-empty employeeCode. Otherwise empty so the
  //                segment is dropped (Requirement 9.4 + the design's
  //                null-meta rule).
  //   - suffix   = startDate when startDate === endDate, else
  //                `${startDate}_to_${endDate}` (mirrors the existing
  //                date-range suffix logic at the top of downloadReport).
  //
  // Empty segments are dropped via `filter(Boolean)` so the `'all'` case and
  // unknown-employee case (lookup returns null) both cleanly omit the
  // employee-code segment.
  //
  // Pure function: no fetches, no state mutation, no DOM access. Output
  // matches the regex
  //   ^(attendance|daily-punch|daily-work|hourly)(-[A-Za-z0-9_]+)?-\d{4}-\d{2}-\d{2}(_to_\d{4}-\d{2}-\d{2})?\.pdf$
  // (Property 8) provided the input dates are ISO `YYYY-MM-DD` strings, which
  // is the format produced by `getDateRangeForQuery`.
  //
  // Examples:
  //   attendance-2024-10-15.pdf
  //   daily-punch-EMP042-2024-10-01_to_2024-10-31.pdf
  // ----------------------------------------------------------------------------------
  const buildPdfFilename = ({ tab, filterEmployee, getEmployeeMeta, startDate, endDate }) => {
    const tabName = TAB_PDF_CONFIG[tab]?.filenameTab || '';
    let empCode = '';
    if (filterEmployee && filterEmployee !== 'all' && typeof getEmployeeMeta === 'function') {
      const meta = getEmployeeMeta(filterEmployee);
      if (meta && meta.employeeCode) {
        empCode = meta.employeeCode;
      }
    }
    const suffix = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
    const parts = [tabName, empCode, suffix].filter(Boolean);
    return `${parts.join('-')}.pdf`;
  };

  // ----------------------------------------------------------------------------------
  // buildPdfTemplate
  // ----------------------------------------------------------------------------------
  // Pure helper that assembles the full PDF print template as a string. Mirrors
  // the structure documented in `design.md` -> "Print Template Structure":
  //
  //   <html>
  //     <head> charset, <title>, inline <style> with @page + print resets </head>
  //     <body>
  //       .title-block (title + meta line: dateRangeText / generatedAt / generatedBy)
  //       .filter-line
  //       .subject (rendered via formatSubjectLine)
  //       .cards   (one .card per summary.cards entry)
  //       <table>  (columns.map(c => c.render(row)) per row, or a single
  //                "No data" row spanning all columns when rows is empty)
  //       .footer  (title on the left, generatedAt on the right)
  //     </body>
  //   </html>
  //
  // Every interpolated value passes through `escapeHtml` so payloads like
  // `Q&A` or `<script>` cannot break the markup. Numeric values used as
  // structural attributes (e.g. `colspan`) are not user-derived and so are
  // emitted directly.
  //
  // The `<style>` block contains the orientation rule that makes Property 6
  // (orientation match) hold:
  //
  //   @page { size: ${orientation}; margin: 14mm; }
  //
  // and the print-only resets that keep table headers repeating per page and
  // prevent rows from splitting (Requirements 7.1-7.4 + the design's print
  // resets).
  //
  // Pure: returns a string. No DOM access, no window access, no fetches. The
  // caller (downloadReport, Task 9) is responsible for routing the result
  // through `printHtmlTemplate`.
  //
  // Defensive defaults: missing `summary.cards` becomes an empty array (no
  // cards rendered, no throw); missing `columns` becomes an empty array which
  // produces an empty header row and a "No data" body — consumers always pass
  // `TAB_PDF_CONFIG[tab].columns`, so this is just a safety net.
  // ----------------------------------------------------------------------------------
  const buildPdfTemplate = ({
    tab: _tab,
    rows,
    summary,
    subject,
    filterContext,
    generatedBy,
    generatedAt,
    orientation,
    title,
    dateRangeText,
    filename,
    columns,
  }) => {
    const safeColumns = Array.isArray(columns) ? columns : [];
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeCards = summary && Array.isArray(summary.cards) ? summary.cards : [];

    const headerCells = safeColumns
      .map(column => `<th>${escapeHtml(column?.header)}</th>`)
      .join('');

    let bodyRows;
    if (safeRows.length === 0) {
      const colspan = safeColumns.length || 1;
      bodyRows = `<tr><td colspan="${colspan}" style="text-align:center;color:#6b7280;">No data</td></tr>`;
    } else {
      bodyRows = safeRows
        .map(row => {
          const cells = safeColumns
            .map(column => {
              const value = typeof column?.render === 'function' ? column.render(row) : '';
              return `<td>${escapeHtml(value)}</td>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
    }

    const cardsMarkup = safeCards
      .map(
        card =>
          `<div class="card"><div class="label">${escapeHtml(
            card?.label
          )}</div><div class="value">${escapeHtml(card?.value)}</div></div>`
      )
      .join('');

    const subjectLine = formatSubjectLine(subject);

    return `<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(filename)}</title>
    <style>
      @page { size: ${escapeHtml(orientation)}; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: Sora, 'Plus Jakarta Sans', Poppins, sans-serif; color: #111827; margin: 0; padding: 16px; }
      .title-block h1 { margin: 0 0 4px; font-size: 18px; }
      .title-block .meta { font-size: 11px; color: #4b5563; }
      .filter-line { font-size: 11px; color: #374151; margin: 8px 0 12px; }
      .subject { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; font-size: 12px; margin-bottom: 12px; }
      .cards { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
      .card { flex: 1 1 140px; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; }
      .card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
      .card .value { font-size: 16px; font-weight: 600; color: #111827; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d1d5db; padding: 6px; font-size: 11px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; }
      .footer { margin-top: 12px; font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; }
      thead { display: table-header-group; }
      tr, td, th { page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <div class="title-block">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">${escapeHtml(dateRangeText)} &middot; Generated ${escapeHtml(generatedAt)} &middot; Generated by: ${escapeHtml(generatedBy)}</div>
    </div>
    <div class="filter-line">${escapeHtml(filterContext)}</div>
    <div class="subject">${escapeHtml(subjectLine)}</div>
    <div class="cards">${cardsMarkup}</div>
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="footer">
      <span>${escapeHtml(title)}</span>
      <span>${escapeHtml(generatedAt)}</span>
    </div>
  </body>
</html>`;
  };

  const downloadReport = (format, data, filename) => {
    const { startDate, endDate } = getDateRangeForQuery();
    const suffix = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
    const sanitizeKey = key =>
      key
        .replace(/^_+/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\./g, ' ')
        .trim();

    const sanitizeExportRows = rows =>
      (rows || []).map(row => {
        const output = {};
        Object.entries(row || {}).forEach(([key, value]) => {
          if (
            key === '_id' ||
            key.endsWith('._id') ||
            key === 'employeeId' ||
            key === 'employee.id' ||
            key === 'employee._id'
          )
            return;
          const label = sanitizeKey(key);
          if (!label) return;

          if (value === null || value === undefined) {
            output[label] = '';
            return;
          }

          if (typeof value === 'object' && !Array.isArray(value)) {
            if (value.name) {
              output[label] = value.name;
            } else if (value.email) {
              output[label] = value.email;
            } else if (value.employeeCode) {
              output[label] = value.employeeCode;
            } else {
              const compact = Object.entries(value)
                .filter(([childKey]) => childKey !== '_id')
                .map(([childKey, childValue]) => `${sanitizeKey(childKey)}: ${childValue ?? ''}`)
                .join(', ');
              output[label] = compact;
            }
            return;
          }

          output[label] = String(value);
        });
        return output;
      });

    const exportRows = sanitizeExportRows(data);

    if (format === 'csv') {
      if (!exportRows || exportRows.length === 0) {
        toast.error('No data to download');
        return;
      }

      const headers = Object.keys(exportRows[0]);
      const csv = [
        headers.join(','),
        ...exportRows.map(row => headers.map(header => row[header]).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${suffix}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      return;
    }

    if (format === 'pdf') {
      // Out-of-scope tabs (e.g. attendance-master) have no PDF button, but
      // guard the entry point anyway so an unknown tab does not crash the
      // print template (Requirements 1.3, 10.2).
      const tabConfig = TAB_PDF_CONFIG[tab];
      if (!tabConfig) {
        toast.error('PDF export is not available for this tab.');
        return;
      }

      // An empty filtered slice is a valid export per Requirement 5.6 and
      // design.md "Error Handling": cards still render with 0/em-dash
      // placeholders and the table emits a single `No data` row. Normalize
      // a missing/non-array `data` to [] so the helpers stay defensive.
      const safeRows = Array.isArray(data) ? data : [];

      const subject = resolveSubject(filterEmployee, getEmployeeMeta);
      const filterContext = resolveFilterContext({
        tab,
        dateFilterType,
        selectedMonth,
        selectedYear,
        particularDate,
        customStartDate,
        customEndDate,
        // Tab-specific active filters: only Attendance currently exposes a
        // status filter beyond the date filter. Daily Punch, Daily Work, and
        // Hourly do not surface extra filter state, so nothing is appended
        // for those tabs.
        ...(tab === 'attendance'
          ? {
              statusFilter: Object.entries(statusFilters || {})
                .filter(([, on]) => on)
                .map(([key]) => formatStatusLabel(key))
                .join('/'),
            }
          : {}),
      });

      // Reuse the auth value resolved at the component top (Requirement 2.5);
      // fall back to 'Unknown' when the email is missing (Requirement 2.6).
      const generatedBy = adminEmail || 'Unknown';
      const now = new Date();
      const generatedAt = `${formatDate(now)} ${formatTime(now)}`;
      const dateRangeText =
        startDate === endDate
          ? formatDate(startDate)
          : `${formatDate(startDate)} - ${formatDate(endDate)}`;

      const pdfFilename = buildPdfFilename({
        tab,
        filterEmployee,
        getEmployeeMeta,
        startDate,
        endDate,
      });

      const summary = tabConfig.summary(safeRows, { startDate, endDate });
      const html = buildPdfTemplate({
        tab,
        rows: safeRows,
        summary,
        subject,
        filterContext,
        generatedBy,
        generatedAt,
        orientation: tabConfig.orientation,
        title: tabConfig.title,
        dateRangeText,
        filename: pdfFilename,
        columns: tabConfig.columns,
      });

      try {
        printHtmlTemplate(html);
      } catch {
        toast.error('Failed to export PDF. Please try again.');
      }
    }
  };

  const getWorkingDaysInRange = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const from = start <= end ? start : end;
    const to = start <= end ? end : start;
    let workingDays = 0;
    const cursor = new Date(from);
    while (cursor <= to) {
      const date = new Date(cursor);
      const isSunday = date.getDay() === 0;
      if (!isSunday) workingDays++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return workingDays;
  };

  const calculateStats = data => {
    const presentDays = data.filter(item => item.status === 'present').length;
    const halfDays = data.filter(item => item.status === 'half-day').length;

    const scopeEmployees = filterEmployee === 'all' ? employees.length : filterEmployee ? 1 : 0;
    const { startDate, endDate } = getDateRangeForQuery();
    const workingDays = getWorkingDaysInRange(startDate, endDate);
    const expectedEmployeeDays = workingDays * scopeEmployees;
    const absentDays = Math.max(expectedEmployeeDays - presentDays - halfDays, 0);

    const avgHours =
      data.length > 0
        ? (data.reduce((sum, item) => sum + (item.actualHours || 0), 0) / data.length).toFixed(1)
        : 0;

    return { presentDays, absentDays, halfDays, avgHours };
  };

  // Escapes HTML-sensitive characters for safe interpolation into the PDF print template.
  // Coerces any value to a string (null/undefined become ''); '&' is replaced first to avoid double-escaping.
  const escapeHtml = value => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const formatDate = value => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDay = value => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', { weekday: 'short' });
  };

  const formatTime = value => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDurationFromMinutes = minutes => {
    const safeMinutes = Number(minutes) || 0;
    const hours = Math.floor(safeMinutes / 60);
    const mins = Math.floor(safeMinutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDurationFromMilliseconds = milliseconds => {
    const safeMillis = Number(milliseconds) || 0;
    return formatDurationFromMinutes(safeMillis / 60000);
  };

  const formatHoursDecimal = hours => `${Number(hours || 0).toFixed(2)}h`;

  const getGrossSpan = record => {
    if (!record?.checkInTime || !record?.checkOutTime) return '—';
    const spanInMinutes = (new Date(record.checkOutTime) - new Date(record.checkInTime)) / 60000;
    if (Number.isNaN(spanInMinutes) || spanInMinutes < 0) return '—';
    return formatDurationFromMinutes(spanInMinutes);
  };

  const getStatusVariant = status => {
    if (status === 'present') return 'bg-green-100 text-green-700';
    if (status === 'half-day') return 'bg-amber-100 text-amber-700';
    if (status === 'checkout-pending') return 'bg-slate-100 text-slate-700';
    if (status === 'absent-early-checkout') return 'bg-orange-100 text-orange-700';
    if (status === 'absent') return 'bg-red-100 text-red-700';
    if (status === 'leave') return 'bg-purple-100 text-purple-700';
    if (status === 'holiday') return 'bg-purple-100 text-purple-700';
    return 'bg-red-100 text-red-700';
  };

  const getCheckInHourBucket = checkInTime => {
    if (!checkInTime) return 'No Check-In';
    const hour = new Date(checkInTime).getHours();
    if (hour < 9) return 'Before 09:00';
    if (hour < 10) return '09:00 - 10:00';
    if (hour < 11) return '10:00 - 11:00';
    if (hour < 12) return '11:00 - 12:00';
    return 'After 12:00';
  };

  const renderAttendanceTab = () => {
    const stats = calculateStats(filteredAttendanceData);
    return (
      <div className="space-y-6 p-6">
        {/* Filters + Present Entries Card */}
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-4">
          <div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Date Type
                </label>
                <select
                  value={dateFilterType}
                  onChange={e => setDateFilterType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="particular">Particular Date</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {dateFilterType === 'monthly' && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i, 1).toLocaleDateString('default', {
                            month: 'short',
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {dateFilterType === 'particular' && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={particularDate}
                    onChange={e => setParticularDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  />
                </div>
              )}
              {dateFilterType === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Employee
                </label>
                <select
                  value={filterEmployee}
                  onChange={e => setFilterEmployee(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {`${emp.name} (${emp.employeeCode || emp._id})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() =>
                      downloadReport('csv', filteredAttendanceData, 'attendance-report')
                    }
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() =>
                      downloadReport('pdf', filteredAttendanceData, 'attendance-report')
                    }
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Present Entries', value: stats.presentDays, color: 'text-success' },
              { label: 'Estimated Absent', value: stats.absentDays, color: 'text-danger' },
              { label: 'Half Day Entries', value: stats.halfDays, color: 'text-warning' },
              { label: 'Average Net Hours', value: stats.avgHours, color: 'text-info' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4 space-y-2"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4">
            <p className="text-xs text-light-text/70 dark:text-dark-text/70">
              Report format follows payroll-style muster: one row per employee-day with in/out time,
              break duration, gross span, net hours, and final attendance status.
            </p>
          </div>
        </div>

        {/* Table Card */}
        <div>
          <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
                  Loading records...
                </p>
              </div>
            ) : filteredAttendanceData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Emp Code
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Check In
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Check Out
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Break
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Gross Span
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Net Hours
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAttendanceData.map((record, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-light-border dark:border-dark-border hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 transition-colors"
                      >
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          <div className="font-medium">{record.employeeName || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {record.employeeCode || '—'}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          <div>{formatDate(record.date)}</div>
                          <div className="text-xs text-light-text/60 dark:text-dark-text/60">
                            {formatDay(record.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatTime(record.checkInTime)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatTime(record.checkOutTime)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatDurationFromMilliseconds(record.totalRecessDuration)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {getGrossSpan(record)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-light-text dark:text-dark-text">
                            {formatHoursDecimal(record.actualHours)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusVariant(record.status)}`}
                          >
                            {record.statusLabel || formatStatusLabel(record.status) || 'unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
                  No attendance records found
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 px-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
            <div>
              {filteredAttendanceData.length > 0
                ? `Showing ${startIndex + 1}-${Math.min(
                    startIndex + RECORDS_PER_PAGE,
                    filteredAttendanceData.length
                  )} of ${filteredAttendanceData.length}`
                : SHOWING_NO_RESULTS}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPunchTab = () => {
    const completePunches = filteredPunchData.filter(
      record => record.checkInTime && record.checkOutTime
    ).length;
    const missedCheckout = filteredPunchData.filter(
      record => record.checkInTime && !record.checkOutTime
    ).length;
    const avgNetHours = filteredPunchData.length
      ? (
          filteredPunchData.reduce((sum, record) => sum + Number(record.actualHours || 0), 0) /
          filteredPunchData.length
        ).toFixed(2)
      : '0.00';

    return (
      <div className="space-y-6 p-6">
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-4">
          {/* Filters */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Date Type
                </label>
                <select
                  value={dateFilterType}
                  onChange={e => setDateFilterType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="particular">Particular Date</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {dateFilterType === 'monthly' && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i, 1).toLocaleDateString('default', { month: 'short' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {dateFilterType === 'particular' && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={particularDate}
                    onChange={e => setParticularDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  />
                </div>
              )}
              {dateFilterType === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Employee
                </label>
                <select
                  value={filterEmployee}
                  onChange={e => setFilterEmployee(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {`${emp.name} (${emp.employeeCode || emp._id})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => downloadReport('csv', filteredPunchData, 'punch-report')}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => downloadReport('pdf', filteredPunchData, 'punch-report')}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Punch Entries', value: filteredPunchData.length, color: 'text-info' },
              { label: 'Complete Punches', value: completePunches, color: 'text-success' },
              { label: 'Missed Checkout', value: missedCheckout, color: 'text-warning' },
              { label: 'Average Net Hours', value: `${avgNetHours}h`, color: 'text-primary' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4 space-y-2"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4">
            <p className="text-xs text-light-text/70 dark:text-dark-text/70">
              Punch report format mirrors attendance muster with clear punch timeline and net time.
            </p>
          </div>
        </div>

        {/* Punch Table */}
        <div>
          <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
                  Loading punch records...
                </p>
              </div>
            ) : filteredPunchData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Emp Code
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Check-In
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Check-Out
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Break
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Punch Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPunchData.map((record, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-light-border dark:border-dark-border hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 transition-colors"
                      >
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          <div className="font-medium">{record.employeeName || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {record.employeeCode || '—'}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          <div>{formatDate(record.date)}</div>
                          <div className="text-xs text-light-text/60 dark:text-dark-text/60">
                            {formatDay(record.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatTime(record.checkInTime)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatTime(record.checkOutTime)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatDurationFromMilliseconds(record.totalRecessDuration)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatHoursDecimal(record.actualHours)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.checkInTime && record.checkOutTime
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {record.checkInTime && record.checkOutTime ? 'Complete' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
                  No punch records found
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 px-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
            <div>
              {filteredPunchData.length > 0
                ? `Showing ${startIndex + 1}-${Math.min(
                    startIndex + RECORDS_PER_PAGE,
                    filteredPunchData.length
                  )} of ${filteredPunchData.length}`
                : SHOWING_NO_RESULTS}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDailyReportTab = () => {
    const submittedReports = filteredReportData.filter(
      record => record.reportText && record.reportText !== 'N/A'
    ).length;
    const pendingReports = Math.max(filteredReportData.length - submittedReports, 0);
    const reportsWithComments = filteredReportData.filter(
      record => record.adminComment && record.adminComment.trim() !== ''
    ).length;

    return (
      <div className="space-y-6 p-6">
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-4">
          {/* Filters */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Date Type
                </label>
                <select
                  value={dateFilterType}
                  onChange={e => setDateFilterType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="particular">Particular Date</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {dateFilterType === 'monthly' && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i, 1).toLocaleDateString('default', { month: 'short' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {dateFilterType === 'particular' && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={particularDate}
                    onChange={e => setParticularDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  />
                </div>
              )}
              {dateFilterType === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Employee
                </label>
                <select
                  value={filterEmployee}
                  onChange={e => setFilterEmployee(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {`${emp.name} (${emp.employeeCode || emp._id})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => downloadReport('csv', filteredReportData, 'daily-work-report')}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => downloadReport('pdf', filteredReportData, 'daily-work-report')}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Entries', value: filteredReportData.length, color: 'text-info' },
              { label: 'Submitted', value: submittedReports, color: 'text-success' },
              { label: 'Pending', value: pendingReports, color: 'text-warning' },
              { label: 'With Comment', value: reportsWithComments, color: 'text-primary' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4 space-y-2"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4">
            <p className="text-xs text-light-text/70 dark:text-dark-text/70">
              Daily work report follows the same structure for quick review, follow-up, and export.
            </p>
          </div>
        </div>

        {/* Daily Report Table */}
        <div>
          <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
                  Loading daily reports...
                </p>
              </div>
            ) : filteredReportData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        View
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Admin Comment
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedReportData.map((record, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-light-border dark:border-dark-border hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 transition-colors"
                      >
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          <div className="font-medium">
                            {record.employee?.name || record.employeeName || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatDate(record.reportDate || record.date)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          <button
                            type="button"
                            onClick={() => openReport(record)}
                            className="px-2 py-1 rounded-md text-xs border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
                          >
                            View
                          </button>
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text min-w-[260px]">
                          <div className="text-xs">
                            {record.adminComment ? record.adminComment : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.reportText && record.reportText !== 'N/A'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {record.reportText && record.reportText !== 'N/A'
                              ? 'Submitted'
                              : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
                  No daily reports found
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 px-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
            <div>
              {filteredReportData.length > 0
                ? `Showing ${startIndex + 1}-${Math.min(
                    startIndex + RECORDS_PER_PAGE,
                    filteredReportData.length
                  )} of ${filteredReportData.length}`
                : SHOWING_NO_RESULTS}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHourlyTab = () => {
    const completeDays = filteredHourlyData.filter(
      record => record.checkInTime && record.checkOutTime
    ).length;
    const incompleteDays = filteredHourlyData.filter(
      record => record.checkInTime && !record.checkOutTime
    ).length;
    const avgNetHours = filteredHourlyData.length
      ? (
          filteredHourlyData.reduce((sum, record) => sum + Number(record.actualHours || 0), 0) /
          filteredHourlyData.length
        ).toFixed(2)
      : '0.00';

    const totalBreakHours = (
      filteredHourlyData.reduce((sum, record) => sum + Number(record.totalRecessDuration || 0), 0) /
      3600000
    ).toFixed(2);

    const hourlyDistribution = [
      'Before 09:00',
      '09:00 - 10:00',
      '10:00 - 11:00',
      '11:00 - 12:00',
      'After 12:00',
      'No Check-In',
    ].map(label => ({
      label,
      count: filteredHourlyData.filter(record => getCheckInHourBucket(record.checkInTime) === label)
        .length,
    }));

    return (
      <div className="space-y-6 p-6">
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-4">
          <div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Date Type
                </label>
                <select
                  value={dateFilterType}
                  onChange={e => setDateFilterType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="particular">Particular Date</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {dateFilterType === 'monthly' && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i, 1).toLocaleDateString('default', { month: 'short' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {dateFilterType === 'particular' && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={particularDate}
                    onChange={e => setParticularDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  />
                </div>
              )}
              {dateFilterType === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Employee
                </label>
                <select
                  value={filterEmployee}
                  onChange={e => setFilterEmployee(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {`${emp.name} (${emp.employeeCode || emp._id})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() =>
                      downloadReport('csv', filteredHourlyData, 'hourly-working-report')
                    }
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() =>
                      downloadReport('pdf', filteredHourlyData, 'hourly-working-report')
                    }
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Hourly Entries', value: filteredHourlyData.length, color: 'text-info' },
              { label: 'Complete Days', value: completeDays, color: 'text-success' },
              { label: 'Incomplete Days', value: incompleteDays, color: 'text-warning' },
              { label: 'Avg Net Hours', value: `${avgNetHours}h`, color: 'text-primary' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4 space-y-2"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4">
              <h4 className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-3">
                Check-In Hour Distribution
              </h4>
              <div className="space-y-2">
                {hourlyDistribution.map(slot => (
                  <div key={slot.label} className="flex items-center justify-between text-sm">
                    <span className="text-light-text/70 dark:text-dark-text/70">{slot.label}</span>
                    <span className="font-semibold text-light-text dark:text-dark-text">
                      {slot.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4">
              <p className="text-xs text-light-text/70 dark:text-dark-text/70 mb-2">
                Hourly working report highlights start-time patterns and day completeness.
              </p>
              <p className="text-sm text-light-text dark:text-dark-text">
                Total break time this month:{' '}
                <span className="font-semibold">{totalBreakHours}h</span>
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
                  Loading hourly report...
                </p>
              </div>
            ) : filteredHourlyData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Check-In Hour
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Check-In
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Check-Out
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Break
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Net Hours
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHourlyData.map((record, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-light-border dark:border-dark-border hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 transition-colors"
                      >
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          <div className="font-medium">{record.employeeName || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          <div>{formatDate(record.date)}</div>
                          <div className="text-xs text-light-text/60 dark:text-dark-text/60">
                            {formatDay(record.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {getCheckInHourBucket(record.checkInTime)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatTime(record.checkInTime)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatTime(record.checkOutTime)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatDurationFromMilliseconds(record.totalRecessDuration)}
                        </td>
                        <td className="px-4 py-3 text-light-text dark:text-dark-text">
                          {formatHoursDecimal(record.actualHours)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.checkInTime && record.checkOutTime
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {record.checkInTime && record.checkOutTime ? 'Complete' : 'Incomplete'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-light-text/60 dark:text-dark-text/60 text-sm">
                  No hourly records found
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 px-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
            <div>
              {filteredHourlyData.length > 0
                ? `Showing ${startIndex + 1}-${Math.min(
                    startIndex + RECORDS_PER_PAGE,
                    filteredHourlyData.length
                  )} of ${filteredHourlyData.length}`
                : SHOWING_NO_RESULTS}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (tab) {
      case 'attendance':
        return renderAttendanceTab();
      case 'daily-punch':
        return renderPunchTab();
      case 'daily-report':
        return renderDailyReportTab();
      case 'hourly':
        return renderHourlyTab();
      case 'attendance-master':
        return (
          <>
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                    From
                  </label>
                  <input
                    type="date"
                    value={attendanceMasterFromDate}
                    onChange={e => setAttendanceMasterFromDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                    To
                  </label>
                  <input
                    type="date"
                    value={attendanceMasterToDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setAttendanceMasterToDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                    Employee
                  </label>
                  <select
                    value={filterEmployee}
                    onChange={e => setFilterEmployee(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-sm"
                  >
                    <option value="all">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {`${emp.name} (${emp.employeeCode || emp._id})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={fetchAttendanceMaster}
                    className="w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                  >
                    Search
                  </button>
                </div>
              </div>
              <div className="relative group/table">
                <div
                  ref={attendanceMasterTableScrollRef}
                  className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border"
                >
                  <table className="min-w-full text-sm">
                    <thead className="bg-light-bg/70 dark:bg-dark-bg/70">
                      <tr>
                        <th className="px-4 py-3 text-left">Emp ID</th>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Dept.</th>
                        <th className="px-4 py-3 text-left">Designation</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Day</th>
                        <th className="px-4 py-3 text-left">First Punch</th>
                        <th className="px-4 py-3 text-left">Last Punch</th>
                        <th className="px-4 py-3 text-left">Total Working Hours</th>
                        <th className="px-4 py-3 text-left">Total Break Hours</th>
                        <th className="px-4 py-3 text-left relative">
                          <span className="inline-flex items-center gap-0 leading-none">
                            Status
                            <button
                              type="button"
                              onClick={() => setStatusFilterOpen(v => !v)}
                              className="inline-flex items-center justify-center leading-none align-middle p-0 m-0 ml-[1px]"
                            >
                              <ListFilterPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </button>
                          </span>
                          {statusFilterOpen ? (
                            <div className="absolute right-2 top-10 z-20 w-44 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card shadow-lg p-3 space-y-2">
                              {['full-day', 'half-day', 'leave', 'absent', 'holiday'].map(
                                statusKey => (
                                  <label
                                    key={statusKey}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={statusFilters[statusKey]}
                                      onChange={e =>
                                        setStatusFilters(prev => ({
                                          ...prev,
                                          [statusKey]: e.target.checked,
                                        }))
                                      }
                                    />
                                    <span>{formatStatusLabel(statusKey)}</span>
                                  </label>
                                )
                              )}
                            </div>
                          ) : null}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? [...Array(8)].map((_, idx) => (
                            <tr
                              key={`skeleton-${idx}`}
                              className="border-t border-light-border dark:border-dark-border animate-pulse"
                            >
                              <td className="px-4 py-3">
                                <div className="h-4 w-14 bg-light-bg dark:bg-dark-bg rounded" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-4 w-28 bg-light-bg dark:bg-dark-bg rounded" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-4 w-20 bg-light-bg dark:bg-dark-bg rounded" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-4 w-24 bg-light-bg dark:bg-dark-bg rounded" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-4 w-24 bg-light-bg dark:bg-dark-bg rounded" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-4 w-16 bg-light-bg dark:bg-dark-bg rounded" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-7 w-24 bg-light-bg dark:bg-dark-bg rounded" />
                              </td>
                            </tr>
                          ))
                        : null}
                      {pagedAttendanceMasterRows.map((row, idx) => {
                        const key = `${row.employeeId}_${row.date}`;
                        return (
                          <tr
                            key={key + idx}
                            className="border-t border-light-border dark:border-dark-border"
                          >
                            <td className="px-4 py-3">{row.employeeCode || '-'}</td>
                            <td className="px-4 py-3">{row.employeeName}</td>
                            <td className="px-4 py-3">{row.department}</td>
                            <td className="px-4 py-3">{row.designation}</td>
                            <td className="px-4 py-3">{row.date}</td>
                            <td className="px-4 py-3">{row.day}</td>
                            <td className="px-4 py-3">
                              {row.checkInTime ? formatTime(row.checkInTime) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {row.checkOutTime ? formatTime(row.checkOutTime) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {formatHoursFromMinutes(row.totalWorkingTime)}
                            </td>
                            <td className="px-4 py-3">
                              {formatHoursFromMs(row.totalRecessDuration)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!row.canEdit) return;
                                  setAttendanceLogPanel({
                                    employeeId: row.employeeId,
                                    rowDate: row.date,
                                  });
                                  setSelectedLogEntryKey(`${row.employeeId}_${row.date}`);
                                }}
                                disabled={savingAttendanceKey === key || !row.canEdit}
                                className="disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                title={row.canEdit ? 'Open attendance log' : 'Payroll processed'}
                              >
                                <AnimatedStatusBadge
                                  status={row.status}
                                  label={row.statusLabel || formatStatusLabel(row.status)}
                                />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!loading && filteredAttendanceMasterRows.length === 0 ? (
                    <div className="p-6 text-center text-sm text-light-text/60 dark:text-dark-text/60">
                      No attendance records found.
                    </div>
                  ) : null}
                </div>
                <div
                  className="absolute left-0 top-0 bottom-0 z-10 w-12 cursor-w-resize"
                  onMouseEnter={() => startAttendanceMasterAutoScroll('left')}
                  onMouseLeave={stopAttendanceMasterAutoScroll}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 top-0 bottom-0 z-10 w-12 cursor-e-resize"
                  onMouseEnter={() => startAttendanceMasterAutoScroll('right')}
                  onMouseLeave={stopAttendanceMasterAutoScroll}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-6 px-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
                <div>
                  {filteredAttendanceMasterRows.length > 0
                    ? `Showing ${startIndex + 1}-${Math.min(
                        startIndex + RECORDS_PER_PAGE,
                        filteredAttendanceMasterRows.length
                      )} of ${filteredAttendanceMasterRows.length}`
                    : SHOWING_NO_RESULTS}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            {attendanceLogPanel ? (
              <div
                className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${isLogPanelVisible ? 'bg-black/30' : 'bg-black/0'}`}
                onClick={() => setAttendanceLogPanel(null)}
              >
                <div
                  className={`w-full max-w-xl h-full bg-light-card dark:bg-dark-card border-l border-light-border dark:border-dark-border shadow-xl flex flex-col transform transition-transform duration-300 ease-out ${isLogPanelVisible ? 'translate-x-0' : 'translate-x-full'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">Attendance Log</h3>
                      <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                        {(() => {
                          const rows =
                            groupedAttendanceRows.get(attendanceLogPanel.employeeId) || [];
                          const current = rows.find(r => r.date === attendanceLogPanel.rowDate);
                          return `${current?.employeeCode || '-'} - ${current?.employeeName || ''}`;
                        })()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttendanceLogPanel(null)}
                      className="text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading
                      ? [...Array(5)].map((_, idx) => (
                          <div
                            key={`panel-skeleton-${idx}`}
                            className="border border-light-border dark:border-dark-border rounded-xl p-4 animate-pulse"
                          >
                            <div className="h-4 w-28 bg-light-bg dark:bg-dark-bg rounded mb-3" />
                            <div className="h-7 w-24 bg-light-bg dark:bg-dark-bg rounded" />
                          </div>
                        ))
                      : null}
                    {(groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []).map(entry => {
                      const key = `${entry.employeeId}_${entry.date}`;
                      const isSelected = entry.date === attendanceLogPanel.rowDate;
                      return (
                        <div
                          key={key}
                          className={`border rounded-xl p-4 cursor-pointer ${selectedLogEntryKey === key ? 'border-primary' : 'border-light-border dark:border-dark-border'}`}
                          onClick={() => setSelectedLogEntryKey(key)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span
                              className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-light-text/60 dark:text-dark-text/60'}`}
                            >
                              {entry.date}
                            </span>
                            <div className="disabled:opacity-60">
                              <AnimatedStatusBadge
                                status={entry.status}
                                label={entry.statusLabel || formatStatusLabel(entry.status)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-light-border dark:border-dark-border p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                      Quick Actions
                    </p>
                    <p className="text-xs text-light-text/50 dark:text-dark-text/50 mb-3">
                      Override Current Status
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {['full-day', 'half-day', 'leave', 'absent'].map(actionStatus => {
                        const selectedEntry = (
                          groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []
                        ).find(
                          entry => `${entry.employeeId}_${entry.date}` === selectedLogEntryKey
                        );
                        return (
                          <button
                            key={actionStatus}
                            type="button"
                            disabled={!selectedEntry || !selectedEntry.canEdit}
                            onClick={() =>
                              selectedEntry &&
                              updateAttendanceMasterStatus(selectedEntry, actionStatus)
                            }
                            className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border text-sm disabled:opacity-50 hover:scale-105 transition-transform"
                          >
                            <AnimatedStatusBadge
                              status={actionStatus}
                              label={formatStatusLabel(actionStatus)}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                        Checkout Time
                      </p>
                      <div className="flex gap-2">
                        <select
                          value={selectedCheckoutHour}
                          onChange={e => setSelectedCheckoutHour(Number(e.target.value))}
                          className="flex-1 px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-sm"
                        >
                          <option value={18}>6:00 PM</option>
                          <option value={19}>7:00 PM</option>
                          <option value={20}>8:00 PM</option>
                          <option value={21}>9:00 PM</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const selectedEntry = (
                              groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []
                            ).find(
                              entry => `${entry.employeeId}_${entry.date}` === selectedLogEntryKey
                            );
                            if (selectedEntry) {
                              updateAttendanceMasterCheckout(selectedEntry, selectedCheckoutHour);
                            }
                          }}
                          disabled={
                            !(groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []).find(
                              entry => `${entry.employeeId}_${entry.date}` === selectedLogEntryKey
                            )?.canEdit
                          }
                          className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-light-text/60 dark:text-dark-text/60">
                      {(groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []).find(
                        entry => `${entry.employeeId}_${entry.date}` === selectedLogEntryKey
                      )?.canEdit
                        ? 'Changes are enabled for unprocessed payroll.'
                        : 'Changes are disabled because payroll is processed for this month.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        );
      default:
        return (
          <div className="p-6 text-center text-light-text/60 dark:text-dark-text/60">
            Select a report to view
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Reports"
          description="View and analyze attendance and work reports."
          icon={<Download className="w-8 h-8 text-primary" />}
        />

        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tabItem => {
              const isActive = tab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => handleTabChange(tabItem.id)}
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
          <div className="mt-4">{renderTabContent()}</div>
        </div>
      </div>
      <Modal
        isOpen={openReportModal}
        onClose={() => setOpenReportModal(false)}
        title={`Report${modalSubject ? ` - ${modalSubject}` : ''}`}
        size="2xl"
      >
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={modalSubject}
            readOnly
            placeholder="Subject"
            className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg px-3 py-2 text-sm text-light-text dark:text-dark-text"
          />

          <div>
            <textarea
              rows={8}
              value={modalBody}
              readOnly
              className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-card px-3 py-2 text-sm text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-xs text-light-text/70 dark:text-dark-text/70 mb-2">
              Admin Comment
            </label>
            <textarea
              rows={3}
              value={modalAdminComment}
              onChange={e => setModalAdminComment(e.target.value)}
              className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-card px-3 py-2 text-sm text-light-text dark:text-dark-text"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenReportModal(false)}
              className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-sm"
            >
              Close
            </button>
            <button
              type="button"
              onClick={saveReportAsAdmin}
              disabled={modalSaving}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm"
            >
              {modalSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

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

export default AdminReports;
