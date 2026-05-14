import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Header from '../../../../components/pageHeader';

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
  const [commentDrafts, setCommentDrafts] = useState({});
  const [savingCommentId, setSavingCommentId] = useState('');

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  const tabs = [
    { id: 'attendance', label: 'Attendance' },
    { id: 'daily-punch', label: 'Daily Punch' },
    { id: 'daily-report', label: 'Daily Work' },
    { id: 'hourly', label: 'Hourly' },
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
    return {
      startDate: formatDateInput(monthStart),
      endDate: formatDateInput(monthEnd),
    };
  };

  const isRecordWithinRange = (recordDate, startDate, endDate) => {
    if (!recordDate || !startDate || !endDate) return false;
    const day = formatDateInput(new Date(recordDate));
    return day >= startDate && day <= endDate;
  };

  const normalizeAttendanceRecord = (record, employeeIdFromFilter = '') => ({
    _id: record._id,
    employeeId: record.employeeId || employeeIdFromFilter,
    employeeName: record.employeeName || '',
    employeeCode: record.employeeCode || '',
    date: record.date,
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
    status: record.status || (record.halfDay ? 'half-day' : 'present'),
    actualHours:
      record.actualHours !== undefined
        ? Number(record.actualHours)
        : Number((((record.totalWorkingTime || record.totalWorkTime || 0) / 60)).toFixed(2)),
    totalWorkingTime: record.totalWorkingTime || record.totalWorkTime || 0,
    totalRecessDuration: record.totalRecessDuration || 0,
  });

  const fetchAttendanceByDateMode = async () => {
    const { startDate, endDate } = getDateRangeForQuery();
    if (!startDate || !endDate) return [];

    if (dateFilterType === 'particular') {
      const response = await fetch(`${BASE_URL}/attendance-summary/date?date=${startDate}`, {
        headers: authHeaders,
      });
      if (!response.ok) return [];
      const data = await response.json();
      const rows = data.summary || [];
      return rows
        .map((record) =>
          normalizeAttendanceRecord(
            {
              ...record,
              date: startDate,
              employeeId: record.employeeId,
              employeeCode: record.employeeCode || '',
              status: record.halfDay ? 'half-day' : 'present',
              totalWorkingTime: record.totalWorkTime || 0,
              actualHours: Number((((record.totalWorkTime || 0) / 60)).toFixed(2)),
            },
            filterEmployee === 'all' ? '' : filterEmployee
          )
        )
        .filter((record) => (filterEmployee === 'all' ? true : record.employeeId === filterEmployee));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthRequests = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= endMonth) {
      const params = new URLSearchParams({
        month: String(cursor.getMonth() + 1),
        year: String(cursor.getFullYear()),
      });
      if (filterEmployee !== 'all') {
        params.set('employeeId', filterEmployee);
      }
      monthRequests.push(
        fetch(`${BASE_URL}/attendance-summary/monthly?${params.toString()}`, { headers: authHeaders })
      );
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const responses = await Promise.all(monthRequests);
    const payloads = await Promise.all(
      responses.map(async (res) => (res.ok ? res.json() : { attendanceData: [] }))
    );

    const merged = payloads.flatMap((data) => {
      const rows = data.attendanceData || data.records || [];
      return rows.map((record) => normalizeAttendanceRecord(record, filterEmployee === 'all' ? '' : filterEmployee));
    });

    return merged.filter((record) => isRecordWithinRange(record.date, startDate, endDate));
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

    if (format === 'csv') {
      if (!data || data.length === 0) {
        toast.error('No data to download');
        return;
      }

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map((row) => headers.map((header) => row[header]).join(',')),
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
      if (!data || data.length === 0) {
        toast.error('No data to export');
        return;
      }

      const headers = Object.keys(data[0] || {});
      const rows = data
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
            <h3 className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">Filters</h3>
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
                    {emp.name} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                Action
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReport('csv', filteredAttendanceData, 'attendance-report')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  CSV
                </button>
                <button
                  onClick={() => downloadReport('pdf', filteredAttendanceData, 'attendance-report')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium"
                >
                  PDF
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
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4">
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
                          {record.status || 'unknown'}
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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
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
          <h3 className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">Filters</h3>
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
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                Action
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReport('csv', filteredPunchData, 'punch-report')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  CSV
                </button>
                <button
                  onClick={() => downloadReport('pdf', filteredPunchData, 'punch-report')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium"
                >
                  PDF
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
              className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-2"
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
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4">
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

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
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
          <h3 className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">Filters</h3>
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
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">Action</label>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReport('csv', filteredReportData, 'daily-work-report')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  CSV
                </button>
                <button
                  onClick={() => downloadReport('pdf', filteredReportData, 'daily-work-report')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium"
                >
                  PDF
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
              className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-2"
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
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4">
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

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
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
            <h3 className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">Filters</h3>
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
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                  Action
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadReport('csv', filteredHourlyData, 'hourly-working-report')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    CSV
                  </button>
                  <button
                    onClick={() => downloadReport('pdf', filteredHourlyData, 'hourly-working-report')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-sm font-medium"
                  >
                    PDF
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

        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4">
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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
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
          <div className="mt-4 rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
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


