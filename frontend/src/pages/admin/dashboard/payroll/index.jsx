import 'react-toastify/dist/ReactToastify.css';

import { Calculator, CheckCircle2, Download, Loader2, Search, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const AdminPayroll = () => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [panelDeductions, setPanelDeductions] = useState({
    lateCheckin: 0,
    halfDay: 0,
    absent: 0,
  });
  const [formState, setFormState] = useState({
    overtimeHours: 0,
    penalties: 0,
    loanAmount: 0,
    extraAmount: 0,
    status: 'unpaid',
  });

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }),
    []
  );
  const isSelectedMonthClosed = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (year < currentYear) return true;
    if (year > currentYear) return false;
    return month < currentMonth;
  }, [month, year]);
  const selectedMonthLabel = useMemo(
    () => new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }),
    [month, year]
  );
  const isPayrollPaidLocked = selectedEmployee?.payroll?.status === 'paid';
  const toIstMonthYear = date => {
    const shifted = new Date(date.getTime() + 330 * 60 * 1000);
    return {
      month: shifted.getUTCMonth() + 1,
      year: shifted.getUTCFullYear(),
    };
  };
  const getJoinedYearMonth = employee => {
    const joinedValue = employee?.joinedDate || employee?.dateOfJoining || employee?.createdAt;

    if (joinedValue instanceof Date) {
      if (Number.isNaN(joinedValue.getTime())) return null;
      return toIstMonthYear(joinedValue);
    }

    const raw = String(joinedValue).trim();
    if (!raw) return null;

    const ddMmYyyy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddMmYyyy) {
      return {
        month: Number(ddMmYyyy[2]),
        year: Number(ddMmYyyy[3]),
      };
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return toIstMonthYear(parsed);
  };
  const isEmployeeEligibleForSelectedMonth = employee => {
    const joined = getJoinedYearMonth(employee);
    if (!joined) return true;

    const joinedMonth = joined.month;
    const joinedYear = joined.year;
    if (year > joinedYear) return true;
    if (year < joinedYear) return false;
    return month >= joinedMonth;
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employee/all?limit=200`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error('Failed to fetch employees.');
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch employees.');
    }
  };

  const fetchPayrolls = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ month, year, limit: 200 });
      const response = await fetch(`${BASE_URL}/payroll?${query.toString()}`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error('Failed to fetch payrolls.');
      const data = await response.json();
      setPayrolls(data.payrolls || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch payrolls.');
    } finally {
      setIsLoading(false);
    }
  };

  const payrollMap = useMemo(() => {
    return payrolls.reduce((acc, payroll) => {
      acc[payroll.employee?._id || payroll.employee] = payroll;
      return acc;
    }, {});
  }, [payrolls]);

  const eligibleEmployees = employees.filter(isEmployeeEligibleForSelectedMonth);

  const filteredEmployees = eligibleEmployees.filter(employee => {
    const query = searchQuery.toLowerCase();
    const payrollStatus = payrollMap[employee._id]?.status || 'unpaid';
    const matchesStatus = statusFilter === 'all' || payrollStatus === statusFilter;
    return (
      (employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query)) &&
      matchesStatus
    );
  });

  const payrollStats = useMemo(() => {
    const paidCount = payrolls.filter(payroll => payroll.status === 'paid').length;
    const processedCount = payrolls.length;
    const pendingCount = Math.max(0, eligibleEmployees.length - processedCount);
    const totalNet = payrolls.reduce((sum, payroll) => sum + Number(payroll.totalSalary || 0), 0);
    return { paidCount, processedCount, pendingCount, totalNet };
  }, [eligibleEmployees.length, payrolls]);

  const headerFont = { fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' };
  const displayFont = { fontFamily: '"DM Serif Display", Georgia, serif' };

  const fetchLatestPayrollForEmployee = async employeeId => {
    const response = await fetch(
      `${BASE_URL}/payroll/employee/${employeeId}?month=${month}&year=${year}`,
      { headers: authHeaders }
    );
    if (!response.ok) throw new Error('Failed to fetch latest employee payroll.');
    const data = await response.json();
    return (data.payrolls || [])[0] || null;
  };

  const openPanel = async employee => {
    const payroll = payrollMap[employee._id];
    setSelectedEmployee({ ...employee, payroll });
    setFormState({
      overtimeHours: payroll?.overtimeHours || 0,
      penalties: payroll?.penalties || 0,
      loanAmount: payroll?.loanAmount || 0,
      extraAmount: payroll?.extraAmount || 0,
      status: payroll?.status || 'unpaid',
    });
    setIsPanelOpen(true);
    try {
      const latestPayroll = await fetchLatestPayrollForEmployee(employee._id);
      setSelectedEmployee(prev => (prev ? { ...prev, payroll: latestPayroll } : prev));
      if (latestPayroll) {
        setFormState(prev => ({
          ...prev,
          overtimeHours: latestPayroll?.overtimeHours || 0,
          penalties: latestPayroll?.penalties || 0,
          loanAmount: latestPayroll?.loanAmount || 0,
          extraAmount: latestPayroll?.extraAmount || 0,
          status: latestPayroll?.status || 'unpaid',
        }));
      }
    } catch (error) {
      toast.error(error.message || 'Failed to refresh employee payroll status.');
    }
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedEmployee(null);
    setPanelDeductions({ lateCheckin: 0, halfDay: 0, absent: 0 });
  };

  const formatDatePart = value => String(value).padStart(2, '0');

  const toRequestDate = (yearValue, monthValue, dayValue) =>
    `${formatDatePart(dayValue)}-${formatDatePart(monthValue)}-${yearValue}`;

  const fetchPanelDeductions = async employeeId => {
    try {
      const startDate = toRequestDate(year, month, 1);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = toRequestDate(year, month, lastDay);

      const [lateRes, absentRes, halfRes] = await Promise.all([
        fetch(
          `${BASE_URL}/late-checkins/deduction?employeeId=${employeeId}&month=${month}&year=${year}`,
          { headers: authHeaders }
        ),
        fetch(
          `${BASE_URL}/attendance-summary/employee-absentee-list?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
          { headers: authHeaders }
        ),
        fetch(
          `${BASE_URL}/attendance-summary/employee-halfdays-list?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
          { headers: authHeaders }
        ),
      ]);

      const lateData = lateRes.ok ? await lateRes.json() : null;
      const absentData = absentRes.ok ? await absentRes.json() : null;
      const halfData = halfRes.ok ? await halfRes.json() : null;

      setPanelDeductions({
        lateCheckin: Number(lateData?.totalDeduction || 0),
        halfDay: Number(halfData?.totalDeduction || 0),
        absent: Number(absentData?.totalDeduction || 0),
      });
    } catch (error) {
      console.error('Error fetching panel deductions:', error);
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      fetchPanelDeductions(selectedEmployee._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, selectedEmployee?._id]);

  useEffect(() => {
    if (!selectedEmployee?._id) return;
    const syncLatest = async () => {
      try {
        const latestPayroll = await fetchLatestPayrollForEmployee(selectedEmployee._id);
        setSelectedEmployee(prev => (prev ? { ...prev, payroll: latestPayroll } : prev));
      } catch (error) {
        // Ignore passive sync failures
      }
    };
    syncLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee?._id, month, year, payrolls.length]);

  const processPayroll = async () => {
    if (!selectedEmployee) return;
    if (!isSelectedMonthClosed) {
      toast.error(`Payroll can be processed only after ${selectedMonthLabel} ${year} ends.`);
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/payroll/process/${selectedEmployee._id}`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month,
          year,
          ...formState,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || 'Failed to process payroll.');
      }
      const data = await response.json();
      toast.success('Payroll processed successfully.');
      setPayrolls(prev => {
        const updated = prev.filter(item => item._id !== data.payroll._id);
        return [data.payroll, ...updated];
      });
      setSelectedEmployee(prev => (prev ? { ...prev, payroll: data.payroll } : prev));
    } catch (error) {
      toast.error(error.message || 'Failed to process payroll.');
    }
  };

  const generatePayslip = async () => {
    const payrollId = selectedEmployee?.payroll?._id;
    if (!payrollId) {
      toast.error('Process payroll before generating payslip.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/payroll/payslip/${payrollId}`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error('Failed to generate payslip.');
      const data = await response.json();
      const payslipWindow = window.open('', '_blank');
      if (payslipWindow) {
        payslipWindow.document.open();
        payslipWindow.document.write(data.payslipHtml || '');
        payslipWindow.document.close();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to generate payslip.');
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchPayrolls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPayrolls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const renderPanelContent = (showClose = false) => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">
            Payroll Detail
          </p>
          <h2 className="text-xl font-semibold">{selectedEmployee?.name || 'Select Employee'}</h2>
          {selectedEmployee ? (
            <p className="text-sm text-light-text/60 dark:text-dark-text/60">
              {selectedEmployee.email}
            </p>
          ) : null}
        </div>
        {showClose ? (
          <button onClick={closePanel} aria-label="Close payroll panel">
            <X className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-5">
        {(() => {
          const payroll = selectedEmployee?.payroll || {};
          const overtimeHours = Number(payroll?.overtimeHours || 0);
          const overtimeAmount = Number(payroll?.overtimeAmount || 0);
          const extraAmount = Number(payroll?.extraAmount || 0);
          const lateCheckinDeduction = Number(panelDeductions.lateCheckin || 0);
          const halfDayDeduction = Number(panelDeductions.halfDay || 0);
          const absentDeduction = Number(panelDeductions.absent || 0);
          const manualPenalty = Number(payroll?.penalties || 0);
          const totalPenalty =
            lateCheckinDeduction + halfDayDeduction + absentDeduction + manualPenalty;

          return (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    value={formState.overtimeHours}
                    disabled={isPayrollPaidLocked}
                    onChange={e =>
                      setFormState(prev => ({ ...prev, overtimeHours: Number(e.target.value) }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                    Penalties
                  </label>
                  <input
                    type="number"
                    value={formState.penalties}
                    disabled={isPayrollPaidLocked}
                    onChange={e =>
                      setFormState(prev => ({ ...prev, penalties: Number(e.target.value) }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                    Loan Amount
                  </label>
                  <input
                    type="number"
                    value={formState.loanAmount}
                    disabled={isPayrollPaidLocked}
                    onChange={e =>
                      setFormState(prev => ({ ...prev, loanAmount: Number(e.target.value) }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                    Extra Amount
                  </label>
                  <input
                    type="number"
                    value={formState.extraAmount}
                    disabled={isPayrollPaidLocked}
                    onChange={e =>
                      setFormState(prev => ({ ...prev, extraAmount: Number(e.target.value) }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  Penalty Summary
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span>Late Check-in Deduction</span>
                  <span>₹{lateCheckinDeduction.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Half Day Deduction</span>
                  <span>₹{halfDayDeduction.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Absent Day Deduction</span>
                  <span>₹{absentDeduction.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Manual Penalties</span>
                  <span>₹{manualPenalty.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Total Penalty</span>
                  <span>₹{totalPenalty.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  Overtime Summary
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span>Overtime Hours</span>
                  <span>{overtimeHours.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Overtime Amount</span>
                  <span>₹{overtimeAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Extras Amount</span>
                  <span>₹{extraAmount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  Status
                </label>
                <select
                  value={formState.status}
                  disabled={isPayrollPaidLocked}
                  onChange={e => setFormState(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  Attendance Summary
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span>Full Days</span>
                  <span>{selectedEmployee?.payroll?.fullDays || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Half Days</span>
                  <span>{selectedEmployee?.payroll?.halfDays || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Paid Leaves</span>
                  <span>{selectedEmployee?.payroll?.paidLeaves || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Unpaid Days</span>
                  <span>{selectedEmployee?.payroll?.unpaidDays || 0}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                  Salary Breakdown
                </p>
                {Number(selectedEmployee?.payroll?.paidLeaves || 0) > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span>Paid Leaves Gross</span>
                    <span>
                      ₹
                      {(
                        Number(selectedEmployee?.payroll?.paidLeaves || 0) *
                        Number(selectedEmployee?.payroll?.dailyWage || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span>Base Salary</span>
                  <span>₹{selectedEmployee?.payroll?.baseSalary?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Bonuses</span>
                  <span>
                    ₹
                    {(
                      Number(selectedEmployee?.payroll?.overtimeAmount || 0) +
                      Number(selectedEmployee?.payroll?.extraAmount || 0)
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Overtime Gross</span>
                  <span>₹{Number(selectedEmployee?.payroll?.overtimeAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Extras Gross</span>
                  <span>₹{Number(selectedEmployee?.payroll?.extraAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Deductions</span>
                  <span>
                    ₹
                    {(
                      Number(panelDeductions.lateCheckin || 0) +
                      Number(panelDeductions.halfDay || 0) +
                      Number(panelDeductions.absent || 0) +
                      Number(selectedEmployee?.payroll?.penalties || 0) +
                      Number(selectedEmployee?.payroll?.loanAmount || 0)
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Total Salary</span>
                  <span className="font-semibold">
                    ₹
                    {(
                      Number(selectedEmployee?.payroll?.baseSalary || 0) +
                      Number(selectedEmployee?.payroll?.overtimeAmount || 0) +
                      Number(selectedEmployee?.payroll?.extraAmount || 0) -
                      (Number(panelDeductions.lateCheckin || 0) +
                        Number(panelDeductions.halfDay || 0) +
                        Number(panelDeductions.absent || 0) +
                        Number(selectedEmployee?.payroll?.penalties || 0) +
                        Number(selectedEmployee?.payroll?.loanAmount || 0))
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={processPayroll}
          disabled={!isSelectedMonthClosed || isPayrollPaidLocked}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4" />
          Process Payroll
        </button>
        {isPayrollPaidLocked ? (
          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
            Payroll is locked for this month because status is paid.
          </p>
        ) : null}
        {!isSelectedMonthClosed ? (
          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
            Payroll unlocks after {selectedMonthLabel} {year} ends.
          </p>
        ) : null}
        <button
          onClick={generatePayslip}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
        >
          <Download className="w-4 h-4" />
          Generate Payslip
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text"
      style={headerFont}
    >
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 bg-white/85 dark:bg-dark-card/85 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">
                Payroll
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold text-light-text dark:text-dark-text">
                Payroll Processing
              </h1>
              <p className="text-sm text-light-text/70 dark:text-dark-text/70 mt-2">
                Review payroll runs, adjust deductions, and generate payslips.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Payroll Run', 'Adjustments', 'Payslips'].map(label => (
                <span
                  key={label}
                  className="px-3 py-2 rounded-lg border border-light-border/70 dark:border-dark-border/70 bg-white/70 dark:bg-dark-card/60 text-xs font-semibold tracking-wide"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="rounded-xl border border-light-border/60 dark:border-dark-border/60 bg-white/80 dark:bg-dark-card/80 p-5">
            <p className="text-xs text-light-text/60 dark:text-dark-text/60">Processed</p>
            <p className="text-2xl font-semibold">{payrollStats.processedCount}</p>
          </div>
          <div className="rounded-xl border border-light-border/60 dark:border-dark-border/60 bg-white/80 dark:bg-dark-card/80 p-5">
            <p className="text-xs text-light-text/60 dark:text-dark-text/60">Pending</p>
            <p className="text-2xl font-semibold">{payrollStats.pendingCount}</p>
          </div>
          <div className="rounded-xl border border-light-border/60 dark:border-dark-border/60 bg-white/80 dark:bg-dark-card/80 p-5">
            <p className="text-xs text-light-text/60 dark:text-dark-text/60">Paid</p>
            <p className="text-2xl font-semibold">{payrollStats.paidCount}</p>
          </div>
          <div className="rounded-xl border border-light-border/60 dark:border-dark-border/60 bg-white/80 dark:bg-dark-card/80 p-5">
            <p className="text-xs text-light-text/60 dark:text-dark-text/60">Net Salary</p>
            <p className="text-2xl font-semibold">₹{payrollStats.totalNet.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6 mt-6 bg-white/80 dark:bg-dark-card/80 border border-light-border dark:border-dark-border rounded-xl px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text/60 dark:text-dark-text/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search employees"
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-4 py-3 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Date(0, index).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-4 py-3 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border"
          >
            {Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index).map(
              value => (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            )}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6">
            <div className="overflow-x-auto rounded-2xl border border-light-border dark:border-dark-border">
              <table className="min-w-full text-sm">
                <thead className="bg-light-bg dark:bg-dark-bg">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Base Salary</th>
                    <th className="px-4 py-3 text-left">Net Salary</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(employee => {
                    const payroll = payrollMap[employee._id];
                    return (
                      <tr
                        key={employee._id}
                        className="border-t border-light-border dark:border-dark-border"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                            {employee.email}
                          </p>
                        </td>
                        <td className="px-4 py-3">₹{payroll?.baseSalary?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3">₹{payroll?.totalSalary?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              payroll?.status === 'paid'
                                ? 'bg-success/15 text-success'
                                : 'bg-warning/15 text-warning'
                            }`}
                          >
                            {payroll?.status || 'unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openPanel(employee)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
                          >
                            <Calculator className="w-4 h-4" />
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-6 rounded-2xl border border-light-border dark:border-dark-border bg-light-card/80 dark:bg-dark-card/80 p-6 shadow-sm">
                {selectedEmployee ? (
                  renderPanelContent()
                ) : (
                  <div className="text-sm text-light-text/60 dark:text-dark-text/60">
                    Select an employee to view payroll details and adjustments.
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      {isPanelOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="h-full w-full max-w-xl bg-light-bg dark:bg-dark-bg p-6 shadow-xl overflow-y-auto">
            {renderPanelContent(true)}
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
      />
    </div>
  );
};

export default AdminPayroll;
