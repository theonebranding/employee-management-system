import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Download,
  Filter,
  Search,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Header from '../../../../components/pageHeader';

const AdminReports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'attendance';
  const [loading, setLoading] = useState(false);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [punchRecords, setPunchRecords] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: '📊' },
    { id: 'daily-punch', label: 'Daily Punch', icon: '⏰' },
    { id: 'daily-report', label: 'Daily Work', icon: '📝' },
    { id: 'hourly', label: 'Hourly', icon: '⏳' },
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
    }
  }, [tab, selectedMonth, selectedYear, filterEmployee]);

  const fetchAttendanceReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/attendance-summary/monthly?month=${selectedMonth}&year=${selectedYear}`,
        { headers: authHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        setAttendanceReport(data.attendanceData || []);
      }
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
      const response = await fetch(
        `${BASE_URL}/attendance/records?month=${selectedMonth}&year=${selectedYear}`,
        { headers: authHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        setPunchRecords(data.records || []);
      }
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
      const response = await fetch(
        `${BASE_URL}/daily-report/reports?month=${selectedMonth}&year=${selectedYear}`,
        { headers: authHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        setDailyReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      toast.error('Failed to load daily reports');
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
    return dailyReports.filter((item) => item.employeeId === filterEmployee);
  }, [dailyReports, filterEmployee]);

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  const downloadReport = (format, data, filename) => {
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
      a.download = `${filename}-${selectedMonth}-${selectedYear}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const calculateStats = (data) => {
    let present = 0, absent = 0, halfDays = 0;
    data.forEach((item) => {
      if (item.status === 'present') present++;
      else if (item.status === 'absent') absent++;
      else if (item.status === 'half-day') halfDays++;
    });
    const avgHours = data.length > 0
      ? (data.reduce((sum, item) => sum + (item.actualHours || 0), 0) / data.length).toFixed(1)
      : 0;
    return { present, absent, halfDays, avgHours };
  };

  const renderAttendanceTab = () => {
    const stats = calculateStats(filteredAttendanceData);
    return (
      <div className="space-y-6 p-6">
        {/* Filters */}
        <div className="bg-light-bg dark:bg-dark-bg rounded-xl border border-light-border/70 dark:border-dark-border p-4 space-y-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text text-sm">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
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
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Employee
              </label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
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
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Action
              </label>
              <button
                onClick={() => downloadReport('csv', filteredAttendanceData, 'attendance-report')}
                className="w-full px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4 inline mr-1" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Present', value: stats.present, color: 'text-green-500 bg-green-50 dark:bg-green-500/10' },
            { label: 'Absent', value: stats.absent, color: 'text-red-500 bg-red-50 dark:bg-red-500/10' },
            { label: 'Half Days', value: stats.halfDays, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' },
            { label: 'Avg Hours', value: stats.avgHours, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`rounded-xl border border-light-border/70 dark:border-dark-border p-4 ${stat.color}`}
            >
              <p className="text-xs text-light-text/60 dark:text-dark-text/60 mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-light-border/70 dark:border-dark-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">Loading records...</p>
            </div>
          ) : filteredAttendanceData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-light-bg dark:bg-dark-bg border-b border-light-border/70 dark:border-dark-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">
                      Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendanceData.map((record, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-light-border/70 dark:border-dark-border hover:bg-light-bg/50 dark:hover:bg-dark-bg/50"
                    >
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        {record.employeeName}
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-700'
                              : record.status === 'absent'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        {record.actualHours || 0}h
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
      </div>
    );
  };

  const renderPunchTab = () => {
    return (
      <div className="space-y-6 p-6">
        {/* Filters */}
        <div className="bg-light-bg dark:bg-dark-bg rounded-xl border border-light-border/70 dark:border-dark-border p-4 space-y-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text text-sm">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i, 1).toLocaleDateString('default', { month: 'short' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Employee
              </label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
                Action
              </label>
              <button
                onClick={() => downloadReport('csv', filteredPunchData, 'punch-report')}
                className="w-full px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4 inline mr-1" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Punch Table */}
        <div className="rounded-xl border border-light-border/70 dark:border-dark-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">Loading punch records...</p>
            </div>
          ) : filteredPunchData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-light-bg dark:bg-dark-bg border-b border-light-border/70 dark:border-dark-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Check-In</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Check-Out</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPunchData.map((record, idx) => (
                    <tr key={idx} className="border-b border-light-border/70 dark:border-dark-border hover:bg-light-bg/50 dark:hover:bg-dark-bg/50">
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{record.employeeName}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{record.checkInTime || '—'}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{record.checkOutTime || '—'}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{record.duration || '—'}</td>
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
      </div>
    );
  };

  const renderDailyReportTab = () => {
    return (
      <div className="space-y-6 p-6">
        {/* Filters */}
        <div className="bg-light-bg dark:bg-dark-bg rounded-xl border border-light-border/70 dark:border-dark-border p-4 space-y-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text text-sm">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(2024, i, 1).toLocaleDateString('default', { month: 'short' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Employee</label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-2">Action</label>
              <button
                onClick={() => downloadReport('csv', filteredReportData, 'daily-work-report')}
                className="w-full px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4 inline mr-1" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Daily Report Table */}
        <div className="rounded-xl border border-light-border/70 dark:border-dark-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-light-text/60 dark:text-dark-text/60 text-sm">Loading daily reports...</p>
            </div>
          ) : filteredReportData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-light-bg dark:bg-dark-bg border-b border-light-border/70 dark:border-dark-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Tasks</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReportData.map((record, idx) => (
                    <tr key={idx} className="border-b border-light-border/70 dark:border-dark-border hover:bg-light-bg/50 dark:hover:bg-dark-bg/50">
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{record.employeeName}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{record.taskCount || 0}</td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{record.summary || '—'}</td>
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
      </div>
    );
  };

  const renderHourlyTab = () => {
    return (
      <div className="p-8 text-center">
        <Clock className="w-16 h-16 mx-auto mb-4 text-primary/20" />
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
          Hourly Report
        </h3>
        <p className="text-light-text/60 dark:text-dark-text/60 text-sm mb-4">
          Detailed hourly attendance and time tracking.
        </p>
        <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-4 text-sm text-light-text/70 dark:text-dark-text/70 text-left max-w-md mx-auto">
          <p className="font-medium mb-2">Coming soon with features:</p>
          <ul className="text-xs space-y-1 list-disc list-inside">
            <li>Hourly breakdown by employee</li>
            <li>Time band analysis</li>
            <li>Peak hours identification</li>
            <li>Productivity metrics</li>
          </ul>
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
      <Header title="Reports" description="View and analyze attendance and work reports." />
      <div>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-light-border dark:border-dark-border overflow-x-auto">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={() => handleTabChange(tabItem.id)}
                className={`px-4 py-3 font-medium transition-all whitespace-nowrap text-sm ${
                  tab === tabItem.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-light-text/60 dark:text-dark-text/60 hover:text-primary'
                }`}
              >
                <span className="mr-2">{tabItem.icon}</span>
                {tabItem.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-light-border/70 dark:border-dark-border shadow-sm">
            {renderTabContent()}
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
};

export default AdminReports;
