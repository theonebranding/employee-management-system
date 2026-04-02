import { Calendar, Download, Loader2, Table2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const defaultSchedule = {
  name: '',
  reportType: 'executive-kpi',
  frequency: 'weekly',
  schedule: {
    dayOfWeek: 1,
    dayOfMonth: 1,
    time: '09:00',
    timezone: 'Asia/Kolkata',
  },
  format: 'csv',
  recipients: [''],
  filters: {},
};

const ReportsDashboard = () => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem('token');

  const [kpis, setKpis] = useState(null);
  const [drilldowns, setDrilldowns] = useState(null);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [trendSeries, setTrendSeries] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [selectedReportRuns, setSelectedReportRuns] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(defaultSchedule);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [kpiRes, drillRes, schedRes, trendRes] = await Promise.all([
        fetch(`${BASE_URL}/reporting/executive-kpis`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/reporting/drilldowns`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/reporting/scheduled`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/reporting/trends?months=6`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [kpiData, drillData, schedData, trendData] = await Promise.all([
        kpiRes.json(),
        drillRes.json(),
        schedRes.json(),
        trendRes.json(),
      ]);

      if (!kpiRes.ok) throw new Error(kpiData.message || 'Failed to fetch KPIs');
      if (!drillRes.ok) throw new Error(drillData.message || 'Failed to fetch drilldowns');
      if (!schedRes.ok) throw new Error(schedData.message || 'Failed to fetch scheduled reports');
      if (!trendRes.ok) throw new Error(trendData.message || 'Failed to fetch trends');

      setKpis(kpiData);
      setDrilldowns(drillData);
      const reports = schedData.reports || [];
      setScheduledReports(reports);
      setTrendSeries(trendData.series || []);

      if (!selectedReportId && reports.length > 0) {
        setSelectedReportId(reports[0]._id);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchRunHistory = async () => {
      if (!selectedReportId) {
        setSelectedReportRuns([]);
        return;
      }
      try {
        const response = await fetch(`${BASE_URL}/reporting/scheduled/${selectedReportId}/runs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch run history');
        setSelectedReportRuns(data.runs || []);
      } catch (error) {
        toast.error(error.message || 'Failed to fetch report run history');
      }
    };

    fetchRunHistory();
  }, [BASE_URL, selectedReportId, token]);

  const createSchedule = async e => {
    e.preventDefault();
    try {
      setSaving(true);
      const recipients = scheduleForm.recipients
        .map(item => item.trim())
        .filter(Boolean);

      const response = await fetch(`${BASE_URL}/reporting/scheduled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...scheduleForm,
          recipients,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create schedule');

      toast.success(data.message || 'Scheduled report created');
      setScheduleForm(defaultSchedule);
      await fetchReportsData();
    } catch (error) {
      toast.error(error.message || 'Failed to create schedule');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async reportId => {
    try {
      const response = await fetch(`${BASE_URL}/reporting/scheduled/${reportId}/run-now`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to queue report');

      toast.success(data.message || 'Report queued successfully');
      await fetchReportsData();
    } catch (error) {
      toast.error(error.message || 'Failed to queue report');
    }
  };

  const toggleActive = async report => {
    try {
      const response = await fetch(`${BASE_URL}/reporting/scheduled/${report._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !report.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update schedule');
      toast.success('Schedule updated');
      await fetchReportsData();
    } catch (error) {
      toast.error(error.message || 'Failed to update schedule');
    }
  };

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Reports & BI"
          icon={<Table2 className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Executive KPI analytics, drilldowns, and scheduled exports."
        />

        {loading ? (
          <div className="rounded-xl p-8 ring-1 ring-light-border dark:ring-dark-border bg-light-card dark:bg-dark-card inline-flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading analytics...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
                <p className="text-xs opacity-70">Headcount</p>
                <p className="text-2xl font-semibold">{kpis?.kpis?.headcount ?? 0}</p>
              </div>
              <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
                <p className="text-xs opacity-70">Absenteeism</p>
                <p className="text-2xl font-semibold">{kpis?.kpis?.absenteeismRate ?? 0}%</p>
              </div>
              <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
                <p className="text-xs opacity-70">Overtime Cost</p>
                <p className="text-2xl font-semibold">INR {kpis?.kpis?.overtimeCost ?? 0}</p>
              </div>
              <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
                <p className="text-xs opacity-70">Leave Liability</p>
                <p className="text-2xl font-semibold">INR {kpis?.kpis?.leaveLiability ?? 0}</p>
              </div>
              <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
                <p className="text-xs opacity-70">Payroll Variance</p>
                <p className="text-2xl font-semibold">INR {kpis?.kpis?.payrollVariance ?? 0}</p>
              </div>
            </div>

            <div className="rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border p-4 overflow-auto">
              <h3 className="text-lg font-semibold mb-3">Drilldown by Department</h3>
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="text-left border-b border-light-border dark:border-dark-border">
                    <th className="py-2 pr-2">Department</th>
                    <th className="py-2 pr-2">Headcount</th>
                    <th className="py-2 pr-2">Present Days</th>
                    <th className="py-2 pr-2">Overtime Hours</th>
                    <th className="py-2 pr-2">Leave Days</th>
                    <th className="py-2 pr-2">Payroll</th>
                  </tr>
                </thead>
                <tbody>
                  {(drilldowns?.byDepartment || []).map(row => (
                    <tr key={row.group} className="border-b border-light-border/40 dark:border-dark-border/40">
                      <td className="py-2 pr-2">{row.group}</td>
                      <td className="py-2 pr-2">{row.headcount}</td>
                      <td className="py-2 pr-2">{row.presentDays}</td>
                      <td className="py-2 pr-2">{row.overtimeHours}</td>
                      <td className="py-2 pr-2">{row.leaveDays}</td>
                      <td className="py-2 pr-2">INR {row.payroll}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border p-4 overflow-auto">
              <h3 className="text-lg font-semibold mb-3">6-Month Trends</h3>
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="text-left border-b border-light-border dark:border-dark-border">
                    <th className="py-2 pr-2">Month</th>
                    <th className="py-2 pr-2">Absenteeism %</th>
                    <th className="py-2 pr-2">Payroll Total</th>
                    <th className="py-2 pr-2">Top Locations</th>
                    <th className="py-2 pr-2">Top Managers</th>
                  </tr>
                </thead>
                <tbody>
                  {trendSeries.map(point => (
                    <tr
                      key={point.label}
                      className="border-b border-light-border/40 dark:border-dark-border/40"
                    >
                      <td className="py-2 pr-2">{point.label}</td>
                      <td className="py-2 pr-2">{point.absenteeismRate}%</td>
                      <td className="py-2 pr-2">INR {point.payrollTotal}</td>
                      <td className="py-2 pr-2 text-sm">
                        {(point.topLocations || [])
                          .map(item => `${item.group} (INR ${item.payroll})`)
                          .join(', ') || '-'}
                      </td>
                      <td className="py-2 pr-2 text-sm">
                        {(point.topManagers || [])
                          .map(item => `${item.group} (INR ${item.payroll})`)
                          .join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form
                onSubmit={createSchedule}
                className="rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border p-4 space-y-3"
              >
                <h3 className="font-semibold text-lg">Create Scheduled Export</h3>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                  placeholder="Schedule name"
                  value={scheduleForm.name}
                  onChange={e => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                    value={scheduleForm.reportType}
                    onChange={e => setScheduleForm(prev => ({ ...prev, reportType: e.target.value }))}
                  >
                    <option value="executive-kpi">Executive KPI</option>
                    <option value="attendance">Attendance</option>
                    <option value="leave">Leave</option>
                    <option value="payroll-variance">Payroll Variance</option>
                  </select>
                  <select
                    className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                    value={scheduleForm.frequency}
                    onChange={e => setScheduleForm(prev => ({ ...prev, frequency: e.target.value }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="time"
                    className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                    value={scheduleForm.schedule.time}
                    onChange={e =>
                      setScheduleForm(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, time: e.target.value },
                      }))
                    }
                  />
                  <select
                    className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                    value={scheduleForm.format}
                    onChange={e => setScheduleForm(prev => ({ ...prev, format: e.target.value }))}
                  >
                    <option value="csv">CSV</option>
                    <option value="xlsx">XLSX</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                  placeholder="Recipients (comma separated emails)"
                  value={scheduleForm.recipients.join(',')}
                  onChange={e =>
                    setScheduleForm(prev => ({
                      ...prev,
                      recipients: e.target.value.split(',').map(item => item.trim()),
                    }))
                  }
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Save Schedule
                </button>
              </form>

              <div className="rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border p-4 overflow-auto">
                <h3 className="font-semibold text-lg mb-3">Scheduled Exports</h3>
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="text-left border-b border-light-border dark:border-dark-border">
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Type</th>
                      <th className="py-2 pr-2">Frequency</th>
                      <th className="py-2 pr-2">Last Run</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledReports.map(report => (
                      <tr
                        key={report._id}
                        className="border-b border-light-border/40 dark:border-dark-border/40"
                      >
                        <td className="py-2 pr-2">{report.name}</td>
                        <td className="py-2 pr-2">{report.reportType}</td>
                        <td className="py-2 pr-2">{report.frequency}</td>
                        <td className="py-2 pr-2">
                          {report.lastRunAt ? new Date(report.lastRunAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => setSelectedReportId(report._id)}
                              className={`px-2 py-1 rounded ${selectedReportId === report._id ? 'bg-primary text-white' : 'bg-light-bg dark:bg-dark-bg'}`}
                            >
                              History
                            </button>
                            <button
                              onClick={() => runNow(report._id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-info/15 text-info"
                            >
                              <Download className="w-3 h-3" /> Run
                            </button>
                            <button
                              onClick={() => toggleActive(report)}
                              className={`px-2 py-1 rounded ${report.isActive ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}
                            >
                              {report.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border p-4 overflow-auto">
              <h3 className="font-semibold text-lg mb-3">Scheduled Export History</h3>
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="text-left border-b border-light-border dark:border-dark-border">
                    <th className="py-2 pr-2">Triggered At</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">Format</th>
                    <th className="py-2 pr-2">Recipients</th>
                    <th className="py-2 pr-2">Size</th>
                    <th className="py-2 pr-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReportRuns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center opacity-70">
                        No run history available for selected report.
                      </td>
                    </tr>
                  ) : (
                    selectedReportRuns.map(run => (
                      <tr
                        key={run._id}
                        className="border-b border-light-border/40 dark:border-dark-border/40"
                      >
                        <td className="py-2 pr-2">{new Date(run.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-2">{run.status}</td>
                        <td className="py-2 pr-2">{run.outputType || '-'}</td>
                        <td className="py-2 pr-2">{run.format}</td>
                        <td className="py-2 pr-2 text-sm">{(run.deliveredTo || []).join(', ') || '-'}</td>
                        <td className="py-2 pr-2">{run.bytes || 0} bytes</td>
                        <td className="py-2 pr-2 text-danger text-sm">{run.error || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;
