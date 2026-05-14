import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ListFilterPlus, CheckCircle2, Circle, Flag, AlertCircle, Clock, Watch } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Header from '../../../../components/pageHeader';

const AnimatedStatusBadge = ({ status, label }) => {
  const statusConfig = {
    'full-day': {
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100/80 dark:bg-green-900/30',
      borderColor: 'border-green-300 dark:border-green-700',
      animation: 'scale-up'
    },
    'half-day': {
      icon: Circle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100/80 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-300 dark:border-yellow-700',
      animation: 'bounce-in'
    },
    'leave': {
      icon: Flag,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100/80 dark:bg-blue-900/30',
      borderColor: 'border-blue-300 dark:border-blue-700',
      animation: 'slide-in'
    },
    'absent': {
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100/80 dark:bg-red-900/30',
      borderColor: 'border-red-300 dark:border-red-700',
      animation: 'pulse-fade'
    },
    'absent-early-checkout': {
      icon: Clock,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100/80 dark:bg-orange-900/30',
      borderColor: 'border-orange-300 dark:border-orange-700',
      animation: 'rotate-in'
    },
    'checkout-pending': {
      icon: Watch,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100/80 dark:bg-gray-900/30',
      borderColor: 'border-gray-300 dark:border-gray-700',
      animation: 'blink'
    }
  };

  const normalizedStatus = label
    ? label.toLowerCase()
        .replace('(', '')
        .replace(')', '')
        .replace(/\s+/g, '-')
    : status;

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
              <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
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
  const [loading, setLoading] = useState(false);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateFilterType, setDateFilterType] = useState('monthly');
  const [particularDate, setParticularDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
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
  });
  const [isLogPanelVisible, setIsLogPanelVisible] = useState(false);
  const [attendanceMasterFromDate, setAttendanceMasterFromDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [attendanceMasterToDate, setAttendanceMasterToDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [commentDrafts, setCommentDrafts] = useState({});
  const [savingCommentId, setSavingCommentId] = useState('');
  const [selectedCheckoutHour, setSelectedCheckoutHour] = useState(18); // Default to 6:00 PM

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  const tabs = [
    { id: 'attendance', label: 'Attendance' },
    { id: 'daily-punch', label: 'Daily Punch' },
    { id: 'daily-report', label: 'Daily Work' },
    { id: 'hourly', label: 'Hourly' },
    { id: 'attendance-master', label: 'Attendance Master' },
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

  // Fetch data based on active tab
  useEffect(() => {
    if (tab === 'attendance') {
      fetchAttendanceReport();
    } else if (tab === 'daily-punch') {
      fetchPunchRecords();
    } else if (tab === 'daily-report') {
      fetchDailyReports();
    } else if (tab === 'hourly') {
      fetchHourlyRecords();
    } else if (tab === 'attendance-master') {
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

  const formatDateInput = (date) => {
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

  const getEmployeeMeta = (employeeId) => {
    if (!employeeId) return null;
    return employees.find((emp) => emp._id === employeeId) || null;
  };

  const normalizeAttendanceRecord = (record, employeeIdFromFilter = '') => {
    const employeeId = record.employeeId || employeeIdFromFilter;
    const fallback = getEmployeeMeta(employeeId);
    // Map full-day to present for display
    const displayStatus = (status) => {
      if (status === 'full-day') return 'present';
      return status || (record.halfDay ? 'half-day' : 'present');
    };
    return {
      _id: record._id,
      employeeId,
      employeeName: record.employeeName || record.employee?.name || fallback?.name || '',
      employeeCode: record.employeeCode || record.employee?.employeeCode || fallback?.employeeCode || '',
      date: record.date,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: displayStatus(record.status),
      statusLabel: record.statusLabel || '',
      actualHours:
        record.actualHours !== undefined
          ? Number(record.actualHours)
          : Number((((record.totalWorkingTime || record.totalWorkTime || 0) / 60)).toFixed(2)),
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
        .map((record) =>
          normalizeAttendanceRecord(
            {
              ...record,
              employeeId: record.employeeId,
              employeeCode: record.employeeCode || '',
              status: record.status, // Use status from attendance-master directly
              totalWorkingTime: record.totalWorkingTime || 0,
              actualHours: Number((((record.totalWorkingTime || 0) / 60)).toFixed(2)),
            },
            filterEmployee === 'all' ? '' : filterEmployee
          )
        )
        .filter((record) => (filterEmployee === 'all' ? true : record.employeeId === filterEmployee));
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

      const response = await fetch(
        `${BASE_URL}/daily-reports?${params.toString()}`,
        { headers: authHeaders }
      );
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

  const updateAdminComment = async (reportId) => {
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
      setDailyReports((prev) =>
        prev.map((report) =>
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
    const onStorage = (e) => {
      if (e.key === 'attendanceUpdated') {
        // refresh if user is viewing the attendance master tab
        if (tab === 'attendance-master') fetchAttendanceMaster();
      }
    };
    const onEvent = () => {
      if (tab === 'attendance-master') fetchAttendanceMaster();
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
      setAttendanceMasterRows((prev) =>
        prev.map((item) =>
          item.employeeId === row.employeeId && item.date === row.date
            ? { ...item, status }
            : item
        )
      );
      // Keep report tabs in sync after attendance master edits
      fetchAttendanceReport();
      fetchPunchRecords();
      fetchHourlyRecords();
      // Notify other views (like Attendance dashboard) to refresh for this date
      try {
        window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: { date: row.date, employeeId: row.employeeId } }));
      } catch (e) {
        // ignore in non-browser environments
      }
      try {
        localStorage.setItem('attendanceUpdated', JSON.stringify({ ts: Date.now(), date: row.date, employeeId: row.employeeId }));
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
        window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: { date: row.date, employeeId: row.employeeId } }));
      } catch (e) {
        // ignore in non-browser environments
      }
      try {
        localStorage.setItem('attendanceUpdated', JSON.stringify({ ts: Date.now(), date: row.date, employeeId: row.employeeId }));
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

  const formatStatusLabel = (value) => {
    if (value === 'present') return 'Present';
    if (value === 'full-day') return 'Full Day';
    if (value === 'half-day') return 'Half Day';
    if (value === 'leave') return 'Leave';
    return 'Absent';
  };
  const formatHoursFromMinutes = (minutes) => {
    const mins = Number(minutes || 0);
    if (!mins) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };
  const formatHoursFromMs = (ms) => {
    const mins = Math.floor(Number(ms || 0) / 60000);
    return formatHoursFromMinutes(mins);
  };
  const groupedAttendanceRows = useMemo(() => {
    const grouped = new Map();
    attendanceMasterRows.forEach((row) => {
      const key = row.employeeId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });
    grouped.forEach((list) => list.sort((a, b) => a.date.localeCompare(b.date)));
    return grouped;
  }, [attendanceMasterRows]);
  const filteredAttendanceMasterRows = useMemo(
    () => {
      return (attendanceMasterRows || []).filter((row) => statusFilters[row.status] !== false);
    },
    [attendanceMasterRows, statusFilters]
  );

  const filteredAttendanceData = useMemo(() => {
    if (filterEmployee === 'all') return attendanceReport;
    return attendanceReport.filter((item) => item.employeeId === filterEmployee);
  }, [attendanceReport, filterEmployee]);

  const filteredPunchData = useMemo(() => {
    if (filterEmployee === 'all') return punchRecords;
    return punchRecords.filter((item) => item.employeeId === filterEmployee);
  }, [punchRecords, filterEmployee]);

  const filteredReportData = useMemo(() => {
    if (filterEmployee === 'all') return dailyReports;
    return dailyReports.filter((item) => {
      const id = item?.employee?._id || item?.employeeId;
      return id === filterEmployee;
    });
  }, [dailyReports, filterEmployee]);

  const filteredHourlyData = useMemo(() => {
    if (filterEmployee === 'all') return hourlyRecords;
    return hourlyRecords.filter((item) => item.employeeId === filterEmployee);
  }, [hourlyRecords, filterEmployee]);

  const RECORDS_PER_PAGE = 15;
  const activeDataCount = tab === 'attendance'
    ? filteredAttendanceData.length
    : tab === 'daily-punch'
      ? filteredPunchData.length
      : tab === 'daily-report'
        ? filteredReportData.length
        : tab === 'hourly'
          ? filteredHourlyData.length
          : tab === 'attendance-master'
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
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);


  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  const downloadReport = (format, data, filename) => {
    const { startDate, endDate } = getDateRangeForQuery();
    const suffix = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
    const sanitizeKey = (key) =>
      key
        .replace(/^_+/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\./g, ' ')
        .trim();

    const sanitizeExportRows = (rows) =>
      (rows || []).map((row) => {
        const output = {};
        Object.entries(row || {}).forEach(([key, value]) => {
          if (
            key === '_id' ||
            key.endsWith('._id') ||
            key === 'employeeId' ||
            key === 'employee.id' ||
            key === 'employee._id'
          ) return;
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
        ...exportRows.map((row) => headers.map((header) => row[header]).join(',')),
      ]
        .join('\n');

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
      if (!exportRows || exportRows.length === 0) {
        toast.error('No data to export');
        return;
      }

      const headers = Object.keys(exportRows[0] || {});
      const rows = exportRows
        .map((row) =>
          `<tr>${headers
            .map((header) => {
              const value = row[header];
              const text =
                value === null || value === undefined
                  ? ''
                  : typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value);
              return `<td style="border:1px solid #d1d5db;padding:6px;font-size:11px;">${text}</td>`;
            })
            .join('')}</tr>`
        )
        .join('');

      const html = `
        <html>
          <head>
            <title>${filename}-${suffix}</title>
          </head>
          <body style="font-family:Arial, sans-serif;padding:16px;">
            <h2 style="margin:0 0 8px 0;">${filename.replace(/-/g, ' ').toUpperCase()}</h2>
            <p style="margin:0 0 12px 0;font-size:12px;">Range: ${startDate} to ${endDate}</p>
            <table style="border-collapse:collapse;width:100%;">
              <thead>
                <tr>
                  ${headers
                    .map(
                      (header) =>
                        `<th style="border:1px solid #9ca3af;padding:6px;background:#f3f4f6;font-size:11px;text-align:left;">${header}</th>`
                    )
                    .join('')}
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Unable to open print window for PDF export');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
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

  const calculateStats = (data) => {
    const presentDays = data.filter((item) => item.status === 'present').length;
    const halfDays = data.filter((item) => item.status === 'half-day').length;

    const scopeEmployees = filterEmployee === 'all' ? employees.length : (filterEmployee ? 1 : 0);
    const { startDate, endDate } = getDateRangeForQuery();
    const workingDays = getWorkingDaysInRange(startDate, endDate);
    const expectedEmployeeDays = workingDays * scopeEmployees;
    const absentDays = Math.max(expectedEmployeeDays - presentDays - halfDays, 0);

    const avgHours = data.length > 0
      ? (data.reduce((sum, item) => sum + (item.actualHours || 0), 0) / data.length).toFixed(1)
      : 0;

    return { presentDays, absentDays, halfDays, avgHours };
  };

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDay = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', { weekday: 'short' });
  };

  const formatTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDurationFromMinutes = (minutes) => {
    const safeMinutes = Number(minutes) || 0;
    const hours = Math.floor(safeMinutes / 60);
    const mins = Math.floor(safeMinutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDurationFromMilliseconds = (milliseconds) => {
    const safeMillis = Number(milliseconds) || 0;
    return formatDurationFromMinutes(safeMillis / 60000);
  };

  const formatHoursDecimal = (hours) => `${Number(hours || 0).toFixed(2)}h`;

  const getGrossSpan = (record) => {
    if (!record?.checkInTime || !record?.checkOutTime) return '—';
    const spanInMinutes = (new Date(record.checkOutTime) - new Date(record.checkInTime)) / 60000;
    if (Number.isNaN(spanInMinutes) || spanInMinutes < 0) return '—';
    return formatDurationFromMinutes(spanInMinutes);
  };

  const getStatusVariant = (status) => {
    if (status === 'present') return 'bg-green-100 text-green-700';
    if (status === 'half-day') return 'bg-amber-100 text-amber-700';
    if (status === 'checkout-pending') return 'bg-slate-100 text-slate-700';
    if (status === 'absent-early-checkout') return 'bg-orange-100 text-orange-700';
    if (status === 'absent') return 'bg-red-100 text-red-700';
    if (status === 'leave') return 'bg-purple-100 text-purple-700';
    return 'bg-red-100 text-red-700';
  };

  const getCheckInHourBucket = (checkInTime) => {
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
                onChange={(e) => setDateFilterType(e.target.value)}
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
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
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
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  >
                    {[2024, 2025, 2026].map((year) => (
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
                  onChange={(e) => setParticularDate(e.target.value)}
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
                    onChange={(e) => setCustomStartDate(e.target.value)}
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
                    onChange={(e) => setCustomEndDate(e.target.value)}
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
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {`${emp.name} (${emp.employeeCode || emp._id})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => downloadReport('csv', filteredAttendanceData, 'attendance-report')}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => downloadReport('pdf', filteredAttendanceData, 'attendance-report')}
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
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
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
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">Loading records...</p>
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
                : 'Showing 0 results'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
      (record) => record.checkInTime && record.checkOutTime
    ).length;
    const missedCheckout = filteredPunchData.filter(
      (record) => record.checkInTime && !record.checkOutTime
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
                onChange={(e) => setDateFilterType(e.target.value)}
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
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
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
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>{year}</option>
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
                  onChange={(e) => setParticularDate(e.target.value)}
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
                    onChange={(e) => setCustomStartDate(e.target.value)}
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
                    onChange={(e) => setCustomEndDate(e.target.value)}
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
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
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
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
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
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">Loading punch records...</p>
            </div>
          ) : filteredPunchData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Emp Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Check-In</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Check-Out</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Break</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Duration</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Punch Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPunchData.map((record, idx) => (
                    <tr key={idx} className="border-t border-light-border dark:border-dark-border hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 transition-colors">
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        <div className="font-medium">{record.employeeName || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{record.employeeCode || '—'}</td>
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
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">No punch records found</p>
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
              : 'Showing 0 results'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
      (record) => record.reportText && record.reportText !== 'N/A'
    ).length;
    const pendingReports = Math.max(filteredReportData.length - submittedReports, 0);
    const reportsWithComments = filteredReportData.filter(
      (record) => record.adminComment && record.adminComment.trim() !== ''
    ).length;

    return (
      <div className="space-y-6 p-6">
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-4">
        {/* Filters */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Date Type</label>
              <select
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value)}
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
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(2024, i, 1).toLocaleDateString('default', { month: 'short' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {dateFilterType === 'particular' && (
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Date</label>
                <input
                  type="date"
                  value={particularDate}
                  onChange={(e) => setParticularDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                />
              </div>
            )}
            {dateFilterType === 'custom' && (
              <>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Employee</label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
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
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
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
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">Loading daily reports...</p>
            </div>
          ) : filteredReportData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Report</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Admin Comment</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedReportData.map((record, idx) => (
                    <tr key={idx} className="border-t border-light-border dark:border-dark-border hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 transition-colors">
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        <div className="font-medium">{record.employee?.name || record.employeeName || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        {formatDate(record.reportDate || record.date)}
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text max-w-md">
                        <p className="line-clamp-2">{record.reportText || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text min-w-[260px]">
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={commentDrafts[record._id] ?? ''}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [record._id]: e.target.value,
                              }))
                            }
                            placeholder="Add admin comment..."
                            className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-card px-3 py-2 text-xs text-light-text dark:text-dark-text"
                          />
                          <button
                            type="button"
                            onClick={() => updateAdminComment(record._id)}
                            disabled={savingCommentId === record._id}
                            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                          >
                            {savingCommentId === record._id ? 'Saving...' : 'Save Comment'}
                          </button>
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
                          {record.reportText && record.reportText !== 'N/A' ? 'Submitted' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">No daily reports found</p>
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
              : 'Showing 0 results'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
      (record) => record.checkInTime && record.checkOutTime
    ).length;
    const incompleteDays = filteredHourlyData.filter(
      (record) => record.checkInTime && !record.checkOutTime
    ).length;
    const avgNetHours = filteredHourlyData.length
      ? (
          filteredHourlyData.reduce((sum, record) => sum + Number(record.actualHours || 0), 0) /
          filteredHourlyData.length
        ).toFixed(2)
      : '0.00';

    const totalBreakHours = (
      filteredHourlyData.reduce(
        (sum, record) => sum + Number(record.totalRecessDuration || 0),
        0
      ) / 3600000
    ).toFixed(2);

    const hourlyDistribution = [
      'Before 09:00',
      '09:00 - 10:00',
      '10:00 - 11:00',
      '11:00 - 12:00',
      'After 12:00',
      'No Check-In',
    ].map((label) => ({
      label,
      count: filteredHourlyData.filter(
        (record) => getCheckInHourBucket(record.checkInTime) === label
      ).length,
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
                  onChange={(e) => setDateFilterType(e.target.value)}
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
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
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
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                    >
                      {[2024, 2025, 2026].map((year) => (
                        <option key={year} value={year}>{year}</option>
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
                    onChange={(e) => setParticularDate(e.target.value)}
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
                      onChange={(e) => setCustomStartDate(e.target.value)}
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
                      onChange={(e) => setCustomEndDate(e.target.value)}
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
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-sm"
                >
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {`${emp.name} (${emp.employeeCode || emp._id})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => downloadReport('csv', filteredHourlyData, 'hourly-working-report')}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => downloadReport('pdf', filteredHourlyData, 'hourly-working-report')}
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
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4">
              <h4 className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-3">
                Check-In Hour Distribution
              </h4>
              <div className="space-y-2">
                {hourlyDistribution.map((slot) => (
                  <div key={slot.label} className="flex items-center justify-between text-sm">
                    <span className="text-light-text/70 dark:text-dark-text/70">{slot.label}</span>
                    <span className="font-semibold text-light-text dark:text-dark-text">{slot.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-4">
              <p className="text-xs text-light-text/70 dark:text-dark-text/70 mb-2">
                Hourly working report highlights start-time patterns and day completeness.
              </p>
              <p className="text-sm text-light-text dark:text-dark-text">
                Total break time this month: <span className="font-semibold">{totalBreakHours}h</span>
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">Loading hourly report...</p>
            </div>
          ) : filteredHourlyData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Check-In Hour</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Check-In</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Check-Out</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Break</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Net Hours</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHourlyData.map((record, idx) => (
                    <tr key={idx} className="border-t border-light-border dark:border-dark-border hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 transition-colors">
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        <div className="font-medium">{record.employeeName || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        <div>{formatDate(record.date)}</div>
                        <div className="text-xs text-light-text/60 dark:text-dark-text/60">{formatDay(record.date)}</div>
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        {getCheckInHourBucket(record.checkInTime)}
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{formatTime(record.checkInTime)}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{formatTime(record.checkOutTime)}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        {formatDurationFromMilliseconds(record.totalRecessDuration)}
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{formatHoursDecimal(record.actualHours)}</td>
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
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">No hourly records found</p>
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
                : 'Showing 0 results'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">From</label>
                <input type="date" value={attendanceMasterFromDate} onChange={(e) => setAttendanceMasterFromDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">To</label>
                <input type="date" value={attendanceMasterToDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setAttendanceMasterToDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Employee</label>
                <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-sm">
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
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
              <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
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
                          onClick={() => setStatusFilterOpen((v) => !v)}
                          className="inline-flex items-center justify-center leading-none align-middle p-0 m-0 ml-[1px]"
                        >
                          <ListFilterPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </span>
                      {statusFilterOpen ? (
                        <div className="absolute right-2 top-10 z-20 w-44 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card shadow-lg p-3 space-y-2">
                          {['full-day', 'half-day', 'leave', 'absent'].map((statusKey) => (
                            <label key={statusKey} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={statusFilters[statusKey]}
                                onChange={(e) =>
                                  setStatusFilters((prev) => ({ ...prev, [statusKey]: e.target.checked }))
                                }
                              />
                              <span>{formatStatusLabel(statusKey)}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(8)].map((_, idx) => (
                      <tr key={`skeleton-${idx}`} className="border-t border-light-border dark:border-dark-border animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 w-14 bg-light-bg dark:bg-dark-bg rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-28 bg-light-bg dark:bg-dark-bg rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-20 bg-light-bg dark:bg-dark-bg rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-24 bg-light-bg dark:bg-dark-bg rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-24 bg-light-bg dark:bg-dark-bg rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-16 bg-light-bg dark:bg-dark-bg rounded" /></td>
                        <td className="px-4 py-3"><div className="h-7 w-24 bg-light-bg dark:bg-dark-bg rounded" /></td>
                      </tr>
                    ))
                  ) : null}
                  {pagedAttendanceMasterRows.map((row, idx) => {
                    const key = `${row.employeeId}_${row.date}`;
                    return (
                      <tr key={key + idx} className="border-t border-light-border dark:border-dark-border">
                        <td className="px-4 py-3">{row.employeeCode || '-'}</td><td className="px-4 py-3">{row.employeeName}</td><td className="px-4 py-3">{row.department}</td><td className="px-4 py-3">{row.designation}</td><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3">{row.day}</td>
                        <td className="px-4 py-3">{row.checkInTime ? formatTime(row.checkInTime) : '-'}</td>
                        <td className="px-4 py-3">{row.checkOutTime ? formatTime(row.checkOutTime) : '-'}</td>
                        <td className="px-4 py-3">{formatHoursFromMinutes(row.totalWorkingTime)}</td>
                        <td className="px-4 py-3">{formatHoursFromMs(row.totalRecessDuration)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (!row.canEdit) return;
                              setAttendanceLogPanel({ employeeId: row.employeeId, rowDate: row.date });
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
              {!loading && filteredAttendanceMasterRows.length === 0 ? <div className="p-6 text-center text-sm text-light-text/60 dark:text-dark-text/60">No attendance records found.</div> : null}
              </div>
              <div className="mt-6 px-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
                <div>
                  {filteredAttendanceMasterRows.length > 0
                    ? `Showing ${startIndex + 1}-${Math.min(
                        startIndex + RECORDS_PER_PAGE,
                        filteredAttendanceMasterRows.length
                      )} of ${filteredAttendanceMasterRows.length}`
                    : 'Showing 0 results'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">Attendance Log</h3>
                      <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                        {(() => {
                          const rows = groupedAttendanceRows.get(attendanceLogPanel.employeeId) || [];
                          const current = rows.find((r) => r.date === attendanceLogPanel.rowDate);
                          return `${current?.employeeCode || '-'} - ${current?.employeeName || ''}`;
                        })()}
                      </p>
                    </div>
                    <button type="button" onClick={() => setAttendanceLogPanel(null)} className="text-2xl leading-none">×</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                      [...Array(5)].map((_, idx) => (
                        <div key={`panel-skeleton-${idx}`} className="border border-light-border dark:border-dark-border rounded-xl p-4 animate-pulse">
                          <div className="h-4 w-28 bg-light-bg dark:bg-dark-bg rounded mb-3" />
                          <div className="h-7 w-24 bg-light-bg dark:bg-dark-bg rounded" />
                        </div>
                      ))
                    ) : null}
                    {(groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []).map((entry) => {
                      const key = `${entry.employeeId}_${entry.date}`;
                      const isSelected = entry.date === attendanceLogPanel.rowDate;
                      return (
                        <div
                          key={key}
                          className={`border rounded-xl p-4 cursor-pointer ${selectedLogEntryKey === key ? 'border-primary' : 'border-light-border dark:border-dark-border'}`}
                          onClick={() => setSelectedLogEntryKey(key)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-light-text/60 dark:text-dark-text/60'}`}>
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
                    <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Quick Actions</p>
                    <p className="text-xs text-light-text/50 dark:text-dark-text/50 mb-3">Override Current Status</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['full-day', 'half-day', 'leave', 'absent'].map((actionStatus) => {
                        const selectedEntry = (groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []).find(
                          (entry) => `${entry.employeeId}_${entry.date}` === selectedLogEntryKey
                        );
                        return (
                          <button
                            key={actionStatus}
                            type="button"
                            disabled={!selectedEntry || !selectedEntry.canEdit}
                            onClick={() => selectedEntry && updateAttendanceMasterStatus(selectedEntry, actionStatus)}
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
                      <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">Checkout Time</p>
                      <div className="flex gap-2">
                        <select
                          value={selectedCheckoutHour}
                          onChange={(e) => setSelectedCheckoutHour(Number(e.target.value))}
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
                            const selectedEntry = (groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []).find(
                              (entry) => `${entry.employeeId}_${entry.date}` === selectedLogEntryKey
                            );
                            if (selectedEntry) {
                              updateAttendanceMasterCheckout(selectedEntry, selectedCheckoutHour);
                            }
                          }}
                          disabled={!((groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []).find((entry) => `${entry.employeeId}_${entry.date}` === selectedLogEntryKey)?.canEdit)}
                          className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-light-text/60 dark:text-dark-text/60">
                      {(groupedAttendanceRows.get(attendanceLogPanel.employeeId) || []).find(
                        (entry) => `${entry.employeeId}_${entry.date}` === selectedLogEntryKey
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
        return <div className="p-6 text-center text-light-text/60 dark:text-dark-text/60">Select a report to view</div>;
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
            {tabs.map((tabItem) => {
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
          <div className="mt-4">
            {renderTabContent()}
          </div>
        </div>
      </div>
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



