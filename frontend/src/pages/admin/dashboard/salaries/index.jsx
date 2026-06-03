/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { Calculator, ChevronDown, Download, Filter, Search, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import { useTheme } from '../../../../context/themeContext';

// String constants used across the file (avoid sonarjs/no-duplicate-string).
const LEAVE_ENCASHMENT_LABEL = 'Leave Encashment';

// eslint-disable-next-line sonarjs/cognitive-complexity
const AdminSalaryManagement = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [previewPayrolls, setPreviewPayrolls] = useState([]);
  const [loanAdvances, setLoanAdvances] = useState([]);
  const [extraAllowances, setExtraAllowances] = useState([]);
  const [extraDetails, setExtraDetails] = useState(null);
  const [loanDetails, setLoanDetails] = useState(null);
  const [paidLeaveDetails, setPaidLeaveDetails] = useState(null);
  const [loanFilterMode, setLoanFilterMode] = useState('all');
  const [loanFilterMonth, setLoanFilterMonth] = useState(new Date().getMonth() + 1);
  const [loanFilterYear, setLoanFilterYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const [settingsPanel, setSettingsPanel] = useState(null);
  const [overtimeSettings, setOvertimeSettings] = useState({
    rateBasis: 'fixed',
    hourlyRate: 100,
    dailyWageMultiplier: 1,
    bufferMinutes: '00:15',
  });
  const [penaltySettings, setPenaltySettings] = useState({
    enabled: true,
    allowedDays: 3,
    method: 'fixed',
    fixedPenaltyPerDay: 0,
    dailyWageMultiplier: 0.5,
    graceTime: '00:20',
  });
  const [loanForm, setLoanForm] = useState({
    employeeId: '',
    reference: '',
    amount: '',
    type: 'loan',
    installmentType: 'monthly',
    monthlyInstallment: '',
    tenureMonths: '',
    transactionDate: '',
    comment: '',
  });
  const [extraSettings, setExtraSettings] = useState({
    defaultExtra: 0,
  });
  const [extraForm, setExtraForm] = useState({
    employeeId: '',
    reference: '',
    amount: '',
    transactionDate: '',
    comment: '',
  });
  const [formState, setFormState] = useState({
    overtimeHours: 0,
    penalties: 0,
    loanAmount: 0,
    extraAmount: 0,
    status: 'unpaid',
  });
  const [autoPenaltyValue, setAutoPenaltyValue] = useState(0);
  const [payslipSettings, setPayslipSettings] = useState({
    logoData: '',
    signatureData: '',
  });
  const [isSavingPayslipSettings, setIsSavingPayslipSettings] = useState(false);
  const [panelDeductions, setPanelDeductions] = useState({
    lateCheckin: 0,
    halfDay: 0,
    absent: 0,
  });
  const salaryTableScrollRef = useRef(null);
  const salaryScrollIntervalRef = useRef(null);
  const panelCloseTimeoutRef = useRef(null);
  const settingsPanelCloseTimeoutRef = useRef(null);
  const hasLoadedMonthYearRef = useRef(false);
  const [isSettingsPanelMounted, setIsSettingsPanelMounted] = useState(false);
  const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(false);
  const [isSettingsContentVisible, setIsSettingsContentVisible] = useState(false);
  const [lateCheckInCounts, setLateCheckInCounts] = useState({});
  const HOURS_PER_DAY = 8;
  const IST_OFFSET_MINUTES = 330;
  const toIstInputDate = (date = new Date()) => {
    const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
    return shifted.toISOString().slice(0, 10);
  };
  const toIstDate = dateValue =>
    new Date(new Date(dateValue).getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
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
      const response = await fetch(`${BASE_URL}/employee/all?page=1&limit=1000`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error('Failed to fetch employees.');
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(error.message || 'Failed to fetch employees.');
    }
  };

  const stopSalaryTableAutoScroll = () => {
    if (salaryScrollIntervalRef.current) {
      clearInterval(salaryScrollIntervalRef.current);
      salaryScrollIntervalRef.current = null;
    }
  };

  const startSalaryTableAutoScroll = direction => {
    if (!salaryTableScrollRef.current) return;
    stopSalaryTableAutoScroll();
    const step = direction === 'left' ? -18 : 18;
    salaryScrollIntervalRef.current = setInterval(() => {
      salaryTableScrollRef.current?.scrollBy({ left: step, behavior: 'auto' });
    }, 16);
  };

  useEffect(
    () => () => {
      stopSalaryTableAutoScroll();
      if (panelCloseTimeoutRef.current) {
        clearTimeout(panelCloseTimeoutRef.current);
      }
      if (settingsPanelCloseTimeoutRef.current) {
        clearTimeout(settingsPanelCloseTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!settingsPanel) {
      setIsSettingsPanelVisible(false);
      setIsSettingsContentVisible(false);
      if (settingsPanelCloseTimeoutRef.current) {
        clearTimeout(settingsPanelCloseTimeoutRef.current);
      }
      settingsPanelCloseTimeoutRef.current = setTimeout(() => {
        setIsSettingsPanelMounted(false);
        settingsPanelCloseTimeoutRef.current = null;
      }, 300);
      return undefined;
    }

    if (settingsPanelCloseTimeoutRef.current) {
      clearTimeout(settingsPanelCloseTimeoutRef.current);
      settingsPanelCloseTimeoutRef.current = null;
    }

    setIsSettingsPanelMounted(true);
    setIsSettingsPanelVisible(false);
    setIsSettingsContentVisible(false);
    const openTimeoutId = setTimeout(() => setIsSettingsPanelVisible(true), 20);
    const contentTimeoutId = setTimeout(() => setIsSettingsContentVisible(true), 120);

    return () => {
      clearTimeout(openTimeoutId);
      clearTimeout(contentTimeoutId);
    };
  }, [settingsPanel]);

  const fetchSalaries = async () => {
    try {
      const response = await fetch(`${BASE_URL}/salary`, { headers: authHeaders });
      if (!response.ok) throw new Error('Failed to fetch salaries.');
      const data = await response.json();
      setSalaries(data.salaries || []);
    } catch (error) {
      console.error('Error fetching salaries:', error);
      toast.error(error.message || 'Failed to fetch salaries.');
    }
  };

  const fetchPayrolls = async () => {
    try {
      const query = new URLSearchParams({ month, year, limit: 100 });
      const response = await fetch(`${BASE_URL}/payroll?${query.toString()}`, {
        headers: authHeaders,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.message || 'Failed to fetch payrolls.';
        throw new Error(message);
      }
      setPayrolls(data.payrolls || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch payrolls.');
    }
  };

  const fetchPayrollPreview = async () => {
    try {
      const query = new URLSearchParams({ month, year });
      const response = await fetch(`${BASE_URL}/payroll/preview?${query.toString()}`, {
        headers: authHeaders,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.message || 'Failed to fetch payroll preview.';
        throw new Error(message);
      }
      setPreviewPayrolls(data.payrolls || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch payroll preview.');
    }
  };

  const fetchLateCheckInCounts = async () => {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const query = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`${BASE_URL}/late-checkins/find?${query.toString()}`, {
        headers: authHeaders,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.message || 'Failed to fetch late check-ins.';
        throw new Error(message);
      }

      const counts = {};
      (data?.lateCheckIns || []).forEach(record => {
        const employeeId = record.employee?._id || record.employee;
        if (!employeeId) return;
        counts[employeeId] = (counts[employeeId] || 0) + 1;
      });
      setLateCheckInCounts(counts);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch late check-ins.');
    }
  };

  const fetchLoanAdvances = async () => {
    try {
      const response = await fetch(`${BASE_URL}/loan-advances`, {
        headers: authHeaders,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.message || 'Failed to fetch loan advances.';
        throw new Error(message);
      }
      setLoanAdvances(data.loanAdvances || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch loan advances.');
    }
  };

  const fetchExtraAllowances = async () => {
    try {
      const syncResponse = await fetch(`${BASE_URL}/extra-allowances/sync-from-attendance`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month, year }),
      });

      if (!syncResponse.ok) {
        const syncData = await syncResponse.json().catch(() => ({}));
        throw new Error(syncData?.message || 'Failed to sync extra allowances from attendance.');
      }

      const response = await fetch(`${BASE_URL}/extra-allowances?status=active`, {
        headers: authHeaders,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.message || 'Failed to fetch extra allowances.';
        throw new Error(message);
      }
      setExtraAllowances(data.extraAllowances || data.allowances || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch extra allowances.');
    }
  };

  const fetchPayslipSettings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/payslip-settings`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error('Failed to fetch payslip settings.');
      const data = await response.json();
      setPayslipSettings({
        logoData: data.settings?.logoData || '',
        signatureData: data.settings?.signatureData || '',
      });
    } catch (error) {
      toast.error(error.message || 'Failed to fetch payslip settings.');
    }
  };

  const fetchPayrollSettings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/payroll-settings`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error('Failed to fetch payroll settings.');
      const data = await response.json();
      const settings = data.settings || {};

      setOvertimeSettings(prev => ({
        rateBasis: settings.overtime?.rateBasis ?? prev.rateBasis,
        hourlyRate: Number(settings.overtime?.hourlyRate ?? prev.hourlyRate),
        dailyWageMultiplier: Number(
          settings.overtime?.dailyWageMultiplier ?? prev.dailyWageMultiplier
        ),
        bufferMinutes: settings.overtime?.bufferMinutes ?? prev.bufferMinutes,
      }));
      setPenaltySettings(prev => ({
        enabled: settings.penalties?.enabled ?? prev.enabled,
        allowedDays: Number(settings.penalties?.allowedDays ?? prev.allowedDays),
        method: settings.penalties?.method ?? prev.method,
        fixedPenaltyPerDay: Number(
          settings.penalties?.fixedPenaltyPerDay ?? prev.fixedPenaltyPerDay
        ),
        dailyWageMultiplier: Number(
          settings.penalties?.dailyWageMultiplier ?? prev.dailyWageMultiplier
        ),
        graceTime: settings.penalties?.graceTime ?? prev.graceTime,
      }));
      setExtraSettings(prev => ({
        defaultExtra: Number(settings.extras?.defaultExtra ?? prev.defaultExtra),
      }));
    } catch (error) {
      toast.error(error.message || 'Failed to fetch payroll settings.');
    }
  };

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchEmployees(),
          fetchSalaries(),
          fetchPayrolls(),
          fetchPayslipSettings(),
          fetchPayrollSettings(),
          fetchLoanAdvances(),
          fetchExtraAllowances(),
          fetchPayrollPreview(),
          fetchLateCheckInCounts(),
        ]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loanForm.employeeId && employees.length > 0) {
      setLoanForm(prev => ({ ...prev, employeeId: employees[0]._id }));
    }
    if (!extraForm.employeeId && employees.length > 0) {
      setExtraForm(prev => ({ ...prev, employeeId: employees[0]._id }));
    }
    if (!loanForm.transactionDate) {
      setLoanForm(prev => ({ ...prev, transactionDate: toIstInputDate() }));
    }
    if (!extraForm.transactionDate) {
      setExtraForm(prev => ({ ...prev, transactionDate: toIstInputDate() }));
    }
  }, [employees, loanForm.employeeId, extraForm.employeeId]);

  useEffect(() => {
    if (!hasLoadedMonthYearRef.current) {
      hasLoadedMonthYearRef.current = true;
      return;
    }

    fetchPayrolls();
    fetchPayrollPreview();
    fetchLateCheckInCounts();
  }, [month, year]);

  useEffect(() => {
    const refreshExtraAllowancesData = () => {
      fetchExtraAllowances();
    };

    const onAttendanceUpdated = () => {
      refreshExtraAllowancesData();
    };

    const onStorageUpdate = event => {
      if (event.key === 'attendanceUpdated') {
        refreshExtraAllowancesData();
      }
    };

    window.addEventListener('attendanceUpdated', onAttendanceUpdated);
    window.addEventListener('storage', onStorageUpdate);

    return () => {
      window.removeEventListener('attendanceUpdated', onAttendanceUpdated);
      window.removeEventListener('storage', onStorageUpdate);
    };
  }, [month, year]);

  const toMonthIndex = (yearValue, monthValue) => yearValue * 12 + (monthValue - 1);

  const isInSelectedMonth = dateValue => {
    if (!dateValue) return false;
    const parsed = toIstDate(dateValue);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getMonth() + 1 === month && parsed.getFullYear() === year;
  };

  const isInMonthYear = (dateValue, targetMonth, targetYear) => {
    if (!dateValue) return false;
    const parsed = toIstDate(dateValue);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getMonth() + 1 === targetMonth && parsed.getFullYear() === targetYear;
  };

  const doesLeaveOverlapSelectedMonth = leave => {
    if (!leave?.startDate || !leave?.endDate) return false;
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    if (Number.isNaN(leaveStart.getTime()) || Number.isNaN(leaveEnd.getTime())) return false;

    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return leaveStart <= monthEnd && leaveEnd >= monthStart;
  };

  const getExtrasForEmployee = employeeId =>
    extraAllowances.filter(record => {
      const recordEmployeeId = record.employee?._id || record.employee;
      if (!recordEmployeeId || recordEmployeeId !== employeeId) return false;
      if (
        record?.reference === LEAVE_ENCASHMENT_LABEL ||
        record?.breakdown?.kind === 'leave-encashment'
      ) {
        return false;
      }
      return isInSelectedMonth(record.transactionDate);
    });

  const getExtraAmountForEmployee = employeeId =>
    getExtrasForEmployee(employeeId).reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const getLeaveEncashmentRecordsForEmployee = employeeId =>
    extraAllowances.filter(record => {
      const recordEmployeeId = record.employee?._id || record.employee;
      if (!recordEmployeeId || recordEmployeeId !== employeeId) return false;
      if (
        !(
          record?.reference === LEAVE_ENCASHMENT_LABEL ||
          record?.breakdown?.kind === 'leave-encashment'
        )
      ) {
        return false;
      }
      return isInSelectedMonth(record.transactionDate);
    });

  const getRecordMonthLabel = record => {
    if (!record?.transactionDate) return 'Current Month';
    const parsed = toIstDate(record.transactionDate);
    if (Number.isNaN(parsed.getTime())) return 'Current Month';
    return parsed.toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
  };

  const getExtraSourceLabel = record => {
    if (record?.reference === 'Compensation') return 'Sunday Compensation';
    if (
      record?.reference === LEAVE_ENCASHMENT_LABEL ||
      record?.breakdown?.kind === 'leave-encashment'
    ) {
      return LEAVE_ENCASHMENT_LABEL;
    }
    return record?.reference?.trim() || 'Manual Extra';
  };

  const getExtraSourcePeriodLabel = record => {
    const monthLabel = getRecordMonthLabel(record);
    if (record?.reference === 'Compensation') return `Sunday · ${monthLabel}`;
    if (
      record?.reference === LEAVE_ENCASHMENT_LABEL ||
      record?.breakdown?.kind === 'leave-encashment'
    ) {
      return `Encashment · ${monthLabel}`;
    }
    return `Manual · ${monthLabel}`;
  };

  const getExtraSourceSummary = records => {
    const summary = {
      sundayCompensation: { amount: 0, count: 0, records: [] },
      manual: { amount: 0, count: 0, byType: {} },
    };

    (records || []).forEach(record => {
      const amount = Number(record?.amount || 0);
      if (record?.reference === 'Compensation') {
        summary.sundayCompensation.amount += amount;
        summary.sundayCompensation.count += 1;
        summary.sundayCompensation.records.push(record);
        return;
      }

      const manualType = record?.reference?.trim() || 'Manual Extra';
      summary.manual.amount += amount;
      summary.manual.count += 1;
      summary.manual.byType[manualType] = summary.manual.byType[manualType] || {
        amount: 0,
        count: 0,
        records: [],
      };
      summary.manual.byType[manualType].amount += amount;
      summary.manual.byType[manualType].count += 1;
      summary.manual.byType[manualType].records.push(record);
    });

    return summary;
  };

  const getLeaveEncashmentSummary = records => {
    const summary = {
      amount: 0,
      count: 0,
      days: 0,
      ratePerDay: 0,
      records: [],
    };

    (records || []).forEach(record => {
      const amount = Number(record?.amount || 0);
      summary.amount += amount;
      summary.count += 1;
      summary.records.push(record);
      summary.days += Number(record?.breakdown?.encashmentDays || 0);
      if (!summary.ratePerDay) {
        summary.ratePerDay = Number(record?.breakdown?.ratePerDay || 0);
      }
    });

    if (!summary.ratePerDay && summary.days) {
      summary.ratePerDay = summary.amount / summary.days;
    }

    return summary;
  };

  const getLoansForEmployee = employeeId =>
    loanAdvances.filter(record => {
      const recordEmployeeId = record.employee?._id || record.employee;
      if (!recordEmployeeId || recordEmployeeId !== employeeId) return false;
      if (loanFilterMode === 'all') return true;
      return isInMonthYear(record.transactionDate, loanFilterMonth, loanFilterYear);
    });

  const getLoanScheduleStatus = (record, monthValue, yearValue) => {
    if (record?.status === 'cancelled') return 'cancelled';
    if (!record?.transactionDate) return record?.status || 'active';
    const transactionDate = toIstDate(record.transactionDate);
    if (Number.isNaN(transactionDate.getTime())) return record?.status || 'active';

    const targetIndex = toMonthIndex(yearValue, monthValue);
    const startIndex = toMonthIndex(
      transactionDate.getUTCFullYear(),
      transactionDate.getUTCMonth() + 1
    );

    if (record.type === 'advance') {
      return targetIndex > startIndex ? 'completed' : 'active';
    }

    if (record.type !== 'loan') return record?.status || 'active';
    if (targetIndex < startIndex) return 'active';

    const totalAmount = Number(record.amount || 0);
    const monthlyInstallment = Number(record.monthlyInstallment || 0);
    const installmentMonths = record.tenureMonths
      ? Number(record.tenureMonths)
      : totalAmount && monthlyInstallment
        ? Math.ceil(totalAmount / monthlyInstallment)
        : 0;
    if (!installmentMonths) return 'active';

    const lastIndex = startIndex + installmentMonths - 1;
    return targetIndex > lastIndex ? 'completed' : 'active';
  };

  const getLoanDeductionForRecord = (record, monthValue, yearValue) => {
    if (!record?.transactionDate) return 0;
    if (getLoanScheduleStatus(record, monthValue, yearValue) !== 'active') return 0;
    const transactionDate = new Date(record.transactionDate);
    if (Number.isNaN(transactionDate.getTime())) return 0;

    const targetIndex = toMonthIndex(yearValue, monthValue);
    const startIndex = toMonthIndex(
      transactionDate.getUTCFullYear(),
      transactionDate.getUTCMonth() + 1
    );

    if (record.type === 'advance') {
      return targetIndex === startIndex ? Number(record.amount || 0) : 0;
    }

    if (record.type !== 'loan') return 0;
    if (targetIndex < startIndex) return 0;

    if (record.tenureMonths && targetIndex >= startIndex + Number(record.tenureMonths)) {
      return 0;
    }

    if (record.installmentType === 'monthly') {
      return Number(record.monthlyInstallment || 0);
    }

    if (record.installmentType === 'tenure' && record.tenureMonths) {
      return Number(record.amount || 0) / Number(record.tenureMonths);
    }

    return 0;
  };

  const loanAdvanceMap = useMemo(() => {
    const map = {};
    loanAdvances.forEach(record => {
      const employeeId = record.employee?._id || record.employee;
      if (!employeeId) return;
      const deduction = getLoanDeductionForRecord(record, month, year);
      if (!deduction) return;
      map[employeeId] = (map[employeeId] || 0) + deduction;
    });
    return map;
  }, [loanAdvances, month, year]);

  const getEmployeeSalary = email => {
    const salaryEntry = salaries.find(
      salary => salary.employeeEmail === email || salary.employee?.email === email
    );
    if (!salaryEntry) return '0.00';
    return Number(salaryEntry.baseSalary ?? salaryEntry.totalSalary ?? 0).toFixed(2);
  };

  const payrollMap = useMemo(() => {
    return payrolls.reduce((acc, payroll) => {
      acc[payroll.employee?._id || payroll.employee] = payroll;
      return acc;
    }, {});
  }, [payrolls]);

  const previewPayrollMap = useMemo(() => {
    return previewPayrolls.reduce((acc, payroll) => {
      acc[payroll.employee?._id || payroll.employee] = payroll;
      return acc;
    }, {});
  }, [previewPayrolls]);

  const mergedPayrollMap = useMemo(() => {
    const map = { ...payrollMap };
    Object.entries(previewPayrollMap).forEach(([employeeId, preview]) => {
      const existing = payrollMap[employeeId];
      if (!existing || existing.status !== 'paid') {
        map[employeeId] = preview;
      }
    });
    return map;
  }, [previewPayrollMap, payrollMap]);

  const autoPenaltyMap = useMemo(() => {
    const map = {};
    const allowedLateDays = Number(penaltySettings.allowedDays || 0);
    const fixedPenalty = Number(penaltySettings.fixedPenaltyPerDay || 0);
    const wageMultiplier = Number(penaltySettings.dailyWageMultiplier || 0);

    employees.forEach(employee => {
      if (!penaltySettings.enabled) return;
      const employeeId = employee._id;
      const lateCount = Number(lateCheckInCounts[employeeId] || 0);
      const excessLateCheckIns = Math.max(0, lateCount - allowedLateDays);
      if (!excessLateCheckIns) return;

      const payroll = mergedPayrollMap[employeeId] || {};
      const dailyWage = Number(payroll.dailyWage || 0);
      const penaltyAmount =
        penaltySettings.method === 'fixed'
          ? excessLateCheckIns * fixedPenalty
          : excessLateCheckIns * dailyWage * wageMultiplier;

      if (penaltyAmount) {
        map[employeeId] = penaltyAmount;
      }
    });

    return map;
  }, [employees, lateCheckInCounts, mergedPayrollMap, penaltySettings]);

  const getPreviewNetPay = (employeeId, payroll) => {
    const dailyWage = Number(payroll?.dailyWage || 0);
    const fullDays = Number(payroll?.fullDays || 0);
    const halfDays = Number(payroll?.halfDays || 0);
    const paidLeaves = Number(payroll?.paidLeaves || 0);
    const overtimeAmount = Number(payroll?.overtimeAmount || 0);
    const extraAmount = Number(getExtraAmountForEmployee(employeeId) || 0);
    const leaveEncashmentAmount = Number(payroll?.leaveEncashmentAmount || 0);
    const penalties = Number(autoPenaltyMap[employeeId] ?? 0);
    const loanAmount = Number(loanAdvanceMap[employeeId] ?? payroll?.computedLoanAmount ?? 0);
    const grossPay =
      fullDays * dailyWage +
      halfDays * dailyWage * 0.5 +
      paidLeaves * dailyWage +
      overtimeAmount +
      extraAmount +
      leaveEncashmentAmount;
    const netPay = grossPay - penalties - loanAmount;

    return Number.isFinite(netPay) ? netPay : 0;
  };

  const fetchLatestPayrollForEmployee = async employeeId => {
    const response = await fetch(
      `${BASE_URL}/payroll/employee/${employeeId}?month=${month}&year=${year}`,
      { headers: authHeaders }
    );
    if (!response.ok) throw new Error('Failed to fetch latest employee payroll.');
    const data = await response.json();
    return (data.payrolls || [])[0] || null;
  };

  const openPanel = async (employee, event) => {
    if (event) event.stopPropagation();
    if (panelCloseTimeoutRef.current) {
      clearTimeout(panelCloseTimeoutRef.current);
      panelCloseTimeoutRef.current = null;
    }
    const payroll = mergedPayrollMap[employee._id];
    setIsPanelMounted(true);
    setIsPanelVisible(false);
    setIsPanelLoading(true);
    setSelectedEmployee({ ...employee, payroll });
    setFormState({
      overtimeHours: payroll?.overtimeHours || 0,
      penalties: payroll?.penalties || 0,
      loanAmount:
        loanAdvanceMap[employee._id] ?? payroll?.computedLoanAmount ?? (payroll?.loanAmount || 0),
      extraAmount: getExtraAmountForEmployee(employee._id),
      status: payroll?.status || 'unpaid',
    });
    setIsPanelOpen(true);
    try {
      requestAnimationFrame(() => setIsPanelVisible(true));
      const [latestPayroll] = await Promise.all([
        fetchLatestPayrollForEmployee(employee._id),
        fetchPanelDeductions(employee._id),
      ]);
      const preferredPayroll = latestPayroll || mergedPayrollMap[employee._id];
      if (preferredPayroll) {
        setSelectedEmployee(prev => (prev ? { ...prev, payroll: preferredPayroll } : prev));
        setFormState(prev => ({
          ...prev,
          overtimeHours: preferredPayroll?.overtimeHours || 0,
          penalties: preferredPayroll?.penalties || 0,
          loanAmount:
            loanAdvanceMap[employee._id] ??
            preferredPayroll?.computedLoanAmount ??
            (preferredPayroll?.loanAmount || 0),
          extraAmount: getExtraAmountForEmployee(employee._id),
          status: preferredPayroll?.status || 'unpaid',
        }));
      }
    } catch (error) {
      toast.error(error.message || 'Failed to refresh employee payroll status.');
    } finally {
      setIsPanelLoading(false);
    }
  };

  const openExtrasPanel = (employee, event) => {
    if (event) event.stopPropagation();
    setExtraForm(prev => ({ ...prev, employeeId: employee._id }));
    setSettingsPanel('extras');
  };

  const openPaidLeavesPanel = (employee, event) => {
    if (event) event.stopPropagation();
    setPaidLeaveDetails({
      employeeId: employee._id,
      employee,
      payroll: mergedPayrollMap[employee._id] || employee?.payroll || null,
      paidLeaves: 0,
      dailyWage: 0,
      paidLeavesGross: 0,
      leaveRecords: [],
      encashmentRecords: [],
      encashmentSummary: { amount: 0, count: 0, days: 0, ratePerDay: 0, records: [] },
    });
    setSettingsPanel('paidLeaves');
  };

  const openLoansPanel = (employee, event) => {
    if (event) event.stopPropagation();
    setLoanForm(prev => ({ ...prev, employeeId: employee._id }));
    setSettingsPanel('loans');
  };

  const openAttendanceMasterForEmployee = employee => {
    if (!employee?._id) return;
    const today = new Date();
    const selectedMonthStart = new Date(year, month - 1, 1);
    const selectedMonthEnd = new Date(year, month, 0);
    const isCurrentSelectedMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const formatDateInput = date => toIstInputDate(date);

    const params = new URLSearchParams({
      tab: 'attendance-master',
      employee: employee._id,
      attendanceFrom: formatDateInput(selectedMonthStart),
      attendanceTo: formatDateInput(isCurrentSelectedMonth ? today : selectedMonthEnd),
    });

    navigate(`/admin/dashboard/reports?${params.toString()}`);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setIsPanelVisible(false);
    setIsPanelLoading(false);
    if (panelCloseTimeoutRef.current) {
      clearTimeout(panelCloseTimeoutRef.current);
    }
    panelCloseTimeoutRef.current = setTimeout(() => {
      setIsPanelMounted(false);
      setSelectedEmployee(null);
      setPanelDeductions({ lateCheckin: 0, halfDay: 0, absent: 0 });
      panelCloseTimeoutRef.current = null;
    }, 300);
  };

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const saveSettingsPanel = async () => {
    if (!settingsPanel) return;

    if (settingsPanel === 'loans') {
      if (!loanForm.employeeId || !loanForm.reference || loanForm.amount === '') {
        toast.error('Please fill employee, reference, and amount.');
        return;
      }

      if (loanForm.type === 'loan') {
        if (loanForm.installmentType === 'monthly' && loanForm.monthlyInstallment === '') {
          toast.error('Please enter monthly installment.');
          return;
        }

        if (loanForm.installmentType === 'tenure' && loanForm.tenureMonths === '') {
          toast.error('Please enter tenure months.');
          return;
        }
      }

      try {
        const response = await fetch(`${BASE_URL}/loan-advances`, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employeeId: loanForm.employeeId,
            reference: loanForm.reference,
            amount: Number(loanForm.amount),
            type: loanForm.type,
            installmentType: loanForm.type === 'loan' ? loanForm.installmentType : null,
            monthlyInstallment:
              loanForm.type === 'loan' && loanForm.installmentType === 'monthly'
                ? Number(loanForm.monthlyInstallment || 0)
                : null,
            tenureMonths:
              loanForm.type === 'loan' && loanForm.installmentType === 'tenure'
                ? Number(loanForm.tenureMonths || 0)
                : null,
            transactionDate: loanForm.transactionDate,
            comment: loanForm.comment,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.message || 'Failed to save loan/advance.');
        }

        toast.success('Loan/advance saved.');
        await fetchLoanAdvances();
        await fetchPayrollPreview();
        await fetchPayrolls();
        setSettingsPanel(null);
        setLoanForm(prev => ({
          employeeId: prev.employeeId,
          reference: '',
          amount: '',
          type: 'loan',
          installmentType: 'monthly',
          monthlyInstallment: '',
          tenureMonths: '',
          transactionDate: toIstInputDate(),
          comment: '',
        }));
      } catch (error) {
        toast.error(error.message || 'Failed to save loan/advance.');
      }

      return;
    }

    if (settingsPanel === 'extras') {
      if (!extraForm.employeeId || !extraForm.reference || extraForm.amount === '') {
        toast.error('Please fill employee, reference, and amount.');
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/extra-allowances`, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employeeId: extraForm.employeeId,
            reference: extraForm.reference,
            amount: Number(extraForm.amount),
            transactionDate: extraForm.transactionDate,
            comment: extraForm.comment,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.message || 'Failed to save extra allowance.');
        }

        toast.success('Extra allowance saved.');
        await fetchExtraAllowances();
        await fetchPayrollPreview();
        await fetchPayrolls();
        setSettingsPanel(null);
        setExtraForm(prev => ({
          employeeId: prev.employeeId,
          reference: '',
          amount: '',
          transactionDate: toIstInputDate(),
          comment: '',
        }));
      } catch (error) {
        toast.error(error.message || 'Failed to save extra allowance.');
      }

      return;
    }

    const payload =
      settingsPanel === 'overtime'
        ? { overtime: overtimeSettings }
        : settingsPanel === 'penalties'
          ? { penalties: penaltySettings }
          : {};

    try {
      const response = await fetch(`${BASE_URL}/admin/payroll-settings`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to update payroll settings.');
      await fetchPayrollSettings();
      await fetchPayrollPreview();
      await fetchPayrolls();
      setSettingsPanel(null);
      toast.success('Settings saved.');
    } catch (error) {
      toast.error(error.message || 'Failed to update payroll settings.');
    }
  };

  const exportPayrollCsv = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Designation',
      'Full Days',
      'Half Days',
      'Paid Leaves',
      'Unpaid Days',
      'Daily Wage',
      'Gross Wage',
      'Base Salary',
      'Overtime',
      'Penalties',
      'Loan & Advance',
      'Extras',
      'Net Pay',
      'Status',
    ];

    const rows = filteredEmployees.map(employee => {
      const payroll = mergedPayrollMap[employee._id] || {};
      const baseSalary = Number(payroll.baseSalary || getEmployeeSalary(employee.email) || 0);
      const overtime = Number(payroll.overtimeAmount || 0);
      const penalties = Number(
        payroll.isPreview ? (autoPenaltyMap[employee._id] ?? 0) : payroll.penalties || 0
      );
      const loanAmount = Number(
        payroll.isPreview
          ? (loanAdvanceMap[employee._id] ?? payroll.computedLoanAmount ?? 0)
          : payroll.loanAmount || 0
      );
      const extras = Number(getExtraAmountForEmployee(employee._id) || 0);
      const grossWage =
        Number(payroll.dailyWage || 0) *
        (Number(payroll.fullDays || 0) + Number(payroll.halfDays || 0) * 0.5);
      const netPay = Number(
        payroll.isPreview ? getPreviewNetPay(employee._id, payroll) : payroll.totalSalary || 0
      );

      return [
        employee.employeeCode || 'N/A',
        employee.name,
        employee.department || 'N/A',
        employee.designation || 'N/A',
        payroll.fullDays || 0,
        payroll.halfDays || 0,
        payroll.paidLeaves || 0,
        payroll.unpaidDays || 0,
        Number(payroll.dailyWage || 0).toFixed(2),
        grossWage.toFixed(2),
        baseSalary.toFixed(2),
        overtime.toFixed(2),
        penalties.toFixed(2),
        loanAmount.toFixed(2),
        extras.toFixed(2),
        netPay.toFixed(2),
        payroll.status || 'unpaid',
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payroll-${month}-${year}.csv`;
    link.click();
  };

  const exportPayrollPdf = () => {
    const rowsHtml = filteredEmployees
      .map(employee => {
        const payroll = mergedPayrollMap[employee._id] || {};
        const baseSalary = Number(payroll.baseSalary || getEmployeeSalary(employee.email) || 0);
        const overtime = Number(payroll.overtimeAmount || 0);
        const penalties = Number(
          payroll.isPreview ? (autoPenaltyMap[employee._id] ?? 0) : payroll.penalties || 0
        );
        const loanAmount = Number(
          payroll.isPreview
            ? (loanAdvanceMap[employee._id] ?? payroll.computedLoanAmount ?? 0)
            : payroll.loanAmount || 0
        );
        const extras = Number(getExtraAmountForEmployee(employee._id) || 0);
        const grossWage =
          Number(payroll.dailyWage || 0) *
          (Number(payroll.fullDays || 0) + Number(payroll.halfDays || 0) * 0.5);
        const netPay = Number(
          payroll.isPreview ? getPreviewNetPay(employee._id, payroll) : payroll.totalSalary || 0
        );

        return `
          <tr>
            <td>${employee.employeeCode || 'N/A'}</td>
            <td>${employee.name}</td>
            <td>${employee.department || 'N/A'}</td>
            <td>${employee.designation || 'N/A'}</td>
            <td>${payroll.fullDays || 0}</td>
            <td>${payroll.halfDays || 0}</td>
            <td>${payroll.paidLeaves || 0}</td>
            <td>${payroll.unpaidDays || 0}</td>
            <td>${Number(payroll.dailyWage || 0).toFixed(2)}</td>
            <td>${grossWage.toFixed(2)}</td>
            <td>${baseSalary.toFixed(2)}</td>
            <td>${overtime.toFixed(2)}</td>
            <td>${penalties.toFixed(2)}</td>
            <td>${loanAmount.toFixed(2)}</td>
            <td>${extras.toFixed(2)}</td>
            <td>${netPay.toFixed(2)}</td>
            <td>${payroll.status || 'unpaid'}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <title>Payroll ${month}-${year}</title>
          <style>
            body { font-family: Sora, "Plus Jakarta Sans", Poppins, sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h2>Payroll Report (${month}/${year})</h2>
          <table>
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Full Days</th>
                <th>Half Days</th>
                <th>Paid Leaves</th>
                <th>Unpaid Days</th>
                <th>Daily Wage</th>
                <th>Gross Wage</th>
                <th>Base Salary</th>
                <th>Overtime</th>
                <th>Penalties</th>
                <th>Loan & Advance</th>
                <th>Extras</th>                
                <th>Net Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.print();
    }
  };

  const formatDatePart = value => String(value).padStart(2, '0');

  const toRequestDate = (yearValue, monthValue, dayValue) =>
    `${formatDatePart(dayValue)}-${formatDatePart(monthValue)}-${yearValue}`;

  const toInputDate = (yearValue, monthValue, dayValue) =>
    `${yearValue}-${formatDatePart(monthValue)}-${formatDatePart(dayValue)}`;

  const rangeStart = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const rangeEnd = useMemo(() => new Date(year, month, 0), [year, month]);

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
      const totalLateCheckIns = Number(lateData?.totalLateCheckIns || 0);
      const allowedLateDays = Number(penaltySettings.allowedDays || 0);
      const excessLateCheckIns = Math.max(0, totalLateCheckIns - allowedLateDays);
      const payroll = mergedPayrollMap[employeeId] || {};
      const dailyWage = Number(payroll.dailyWage || 0);

      let computedPenalty = 0;
      if (penaltySettings.enabled && excessLateCheckIns > 0) {
        if (penaltySettings.method === 'fixed') {
          computedPenalty = excessLateCheckIns * Number(penaltySettings.fixedPenaltyPerDay || 0);
        } else {
          computedPenalty =
            excessLateCheckIns * dailyWage * Number(penaltySettings.dailyWageMultiplier || 0);
        }
      }

      setPanelDeductions({
        lateCheckin: computedPenalty,
        halfDay: Number(halfData?.totalDeduction || 0),
        absent: Number(absentData?.totalDeduction || 0),
      });

      setAutoPenaltyValue(computedPenalty);
      if (penaltySettings.enabled) {
        const roundedPenalty = Number(
          Number.isFinite(computedPenalty) ? Math.round(computedPenalty * 100) / 100 : 0
        );
        setFormState(prev => ({ ...prev, penalties: roundedPenalty }));
      }
    } catch (error) {
      console.error('Error fetching panel deductions:', error);
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      fetchPanelDeductions(selectedEmployee._id);
    }
  }, [month, year, selectedEmployee?._id]);

  useEffect(() => {
    if (!selectedEmployee?._id) return;
    const syncLatest = async () => {
      try {
        const latestPayroll = await fetchLatestPayrollForEmployee(selectedEmployee._id);
        const fallbackPayroll = mergedPayrollMap[selectedEmployee._id];
        const preferredPayroll = latestPayroll || fallbackPayroll;
        setSelectedEmployee(prev =>
          prev ? { ...prev, payroll: preferredPayroll || prev.payroll } : prev
        );
        if (preferredPayroll) {
          setFormState(prev => ({
            ...prev,
            overtimeHours: Number(preferredPayroll?.overtimeHours || 0),
            penalties: Number(preferredPayroll?.penalties || 0),
            loanAmount: loanAdvances.find(item => item.employee === selectedEmployee._id)?._id
              ? prev.loanAmount
              : Number((preferredPayroll?.computedLoanAmount ?? preferredPayroll?.loanAmount) || 0),
            extraAmount: getExtraAmountForEmployee(selectedEmployee._id),
            status: preferredPayroll?.status || prev.status,
          }));
        }
      } catch (error) {
        const fallbackPayroll = mergedPayrollMap[selectedEmployee._id];
        setSelectedEmployee(prev =>
          prev ? { ...prev, payroll: fallbackPayroll || prev.payroll } : prev
        );
        if (fallbackPayroll) {
          setFormState(prev => ({
            ...prev,
            overtimeHours: Number(fallbackPayroll?.overtimeHours || 0),
            penalties: Number(fallbackPayroll?.penalties || 0),
            loanAmount: Number(
              (fallbackPayroll?.computedLoanAmount ?? fallbackPayroll?.loanAmount) || 0
            ),
            extraAmount: getExtraAmountForEmployee(selectedEmployee._id),
            status: fallbackPayroll?.status || prev.status,
          }));
        }
      }
    };
    syncLatest();

    //}, [selectedEmployee?._id, month, year, payrolls.length]);
  }, [selectedEmployee?._id, month, year, payrolls, previewPayrolls]);
  useEffect(() => {
    if (settingsPanel !== 'extras') {
      setExtraDetails(null);
      return;
    }
    if (!extraForm.employeeId) {
      setExtraDetails(null);
      return;
    }
    const records = getExtrasForEmployee(extraForm.employeeId);
    const total = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const employee = employees.find(item => item._id === extraForm.employeeId) || null;
    setExtraDetails({ employee, records, total, count: records.length });
  }, [settingsPanel, extraForm.employeeId, extraAllowances, month, year, employees]);

  useEffect(() => {
    if (settingsPanel !== 'paidLeaves') {
      setPaidLeaveDetails(null);
      return;
    }
    if (!paidLeaveDetails?.employeeId) {
      setPaidLeaveDetails(null);
      return;
    }

    let active = true;

    const syncPaidLeaveDetails = async () => {
      try {
        const employee = employees.find(item => item._id === paidLeaveDetails.employeeId) || null;
        const payroll = mergedPayrollMap[paidLeaveDetails.employeeId] || employee?.payroll || null;
        const dailyWage = Number(payroll?.dailyWage || 0);

        const [leaveResponse] = await Promise.all([
          fetch(`${BASE_URL}/leaves/employee-leaves/${paidLeaveDetails.employeeId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);

        const leaveData = leaveResponse.ok
          ? await leaveResponse.json().catch(() => ({}))
          : { leaves: [] };
        const approvedLeaves = (leaveData.leaves || [])
          .filter(leave => leave?.status === 'approved')
          .filter(doesLeaveOverlapSelectedMonth)
          .filter(leave => Number(leave.paidDays || 0) > 0 || Boolean(leave.isPaidLeave));

        const paidLeaves = approvedLeaves.reduce(
          (sum, leave) => sum + Number(leave.paidDays || 0),
          0
        );
        const paidLeavesGross = paidLeaves * dailyWage;
        const encashmentRecords = getLeaveEncashmentRecordsForEmployee(paidLeaveDetails.employeeId);
        const encashmentSummary = getLeaveEncashmentSummary(encashmentRecords);

        if (!active) return;

        setPaidLeaveDetails({
          employeeId: paidLeaveDetails.employeeId,
          employee,
          payroll,
          paidLeaves,
          dailyWage,
          paidLeavesGross,
          leaveRecords: approvedLeaves,
          encashmentRecords,
          encashmentSummary,
        });
      } catch (error) {
        if (!active) return;
        toast.error(error.message || 'Failed to load paid leave summary.');
      }
    };

    syncPaidLeaveDetails();

    return () => {
      active = false;
    };
  }, [
    settingsPanel,
    paidLeaveDetails?.employeeId,
    mergedPayrollMap,
    extraAllowances,
    month,
    year,
    employees,
  ]);

  useEffect(() => {
    if (settingsPanel !== 'loans') {
      setLoanDetails(null);
      return;
    }
    if (!loanForm.employeeId) {
      setLoanDetails(null);
      return;
    }
    const records = getLoansForEmployee(loanForm.employeeId);
    const total = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const employee = employees.find(item => item._id === loanForm.employeeId) || null;
    setLoanDetails({ employee, records, total, count: records.length });
  }, [settingsPanel, loanForm.employeeId, loanAdvances, month, year, employees]);

  const processPayroll = async () => {
    if (!selectedEmployee) return;
    if (!isSelectedMonthClosed) {
      toast.error(`Payroll can be processed only after ${selectedMonthLabel} ${year} ends.`);
      return;
    }
    const selectedPayroll = selectedEmployee?.payroll || {};
    const derivedPenalties = Number(
      selectedPayroll?.isPreview
        ? (autoPenaltyMap[selectedEmployee._id] ?? 0)
        : selectedPayroll?.penalties || 0
    );
    const derivedLoanAmount = Number(
      selectedPayroll?.isPreview
        ? (loanAdvanceMap[selectedEmployee._id] ?? selectedPayroll?.computedLoanAmount ?? 0)
        : selectedPayroll?.loanAmount || 0
    );
    const derivedOvertimeHours = Number(selectedPayroll?.overtimeHours || 0);
    const derivedExtraAmount = getExtraAmountForEmployee(selectedEmployee._id);
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
          overtimeHours: derivedOvertimeHours,
          penalties: derivedPenalties,
          loanAmount: derivedLoanAmount,
          extraAmount: derivedExtraAmount,
          status: formState.status,
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
      await fetchExtraAllowances();
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

  const downloadPayslipPdf = async () => {
    const payrollId = selectedEmployee?.payroll?._id;
    if (!payrollId) {
      toast.error('Process payroll before downloading payslip.');
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
        setTimeout(() => {
          payslipWindow.focus();
          payslipWindow.print();
        }, 300);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to generate payslip.');
    }
  };

  const savePayslipSettings = async () => {
    try {
      setIsSavingPayslipSettings(true);
      const response = await fetch(`${BASE_URL}/admin/payslip-settings`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logoData: payslipSettings.logoData,
          signatureData: payslipSettings.signatureData,
        }),
      });
      if (!response.ok) throw new Error('Failed to update payslip settings.');
      const data = await response.json();
      setPayslipSettings({
        logoData: data.settings?.logoData || '',
        signatureData: data.settings?.signatureData || '',
      });
      toast.success('Payslip settings saved.');
    } catch (error) {
      toast.error(error.message || 'Failed to update payslip settings.');
    } finally {
      setIsSavingPayslipSettings(false);
    }
  };

  const handleFileToDataUrl = (file, onLoad) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoad(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeWhiteBackground = (dataUrl, threshold = 240) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const handleLogoChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileToDataUrl(file, dataUrl => {
      setPayslipSettings(prev => ({ ...prev, logoData: dataUrl }));
    });
  };

  const handleSignatureChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileToDataUrl(file, async dataUrl => {
      const processed = await removeWhiteBackground(dataUrl);
      setPayslipSettings(prev => ({ ...prev, signatureData: processed }));
    });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const departmentOptions = useMemo(() => {
    const uniqueDepartments = new Set();
    employees.forEach(employee => {
      if (employee.department) uniqueDepartments.add(employee.department);
    });
    return Array.from(uniqueDepartments).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const eligibleEmployees = employees.filter(isEmployeeEligibleForSelectedMonth);

  const filteredEmployees = eligibleEmployees
    .filter(employee => {
      if (!normalizedQuery) return true;
      return (
        employee.name.toLowerCase().includes(normalizedQuery) ||
        employee.email.toLowerCase().includes(normalizedQuery) ||
        (employee.employeeCode || '').toLowerCase().includes(normalizedQuery) ||
        (employee.department || '').toLowerCase().includes(normalizedQuery) ||
        (employee.designation || '').toLowerCase().includes(normalizedQuery)
      );
    })
    .filter(employee => {
      if (departmentFilter === 'all') return true;
      return employee.department === departmentFilter;
    })
    .filter(employee => {
      const payrollStatus = mergedPayrollMap[employee._id]?.status || 'unpaid';
      return statusFilter === 'all' || payrollStatus === statusFilter;
    })
    .sort((a, b) => {
      if (sortOrder === 'name') return a.name.localeCompare(b.name);
      if (sortOrder === 'email') return a.email.localeCompare(b.email);
      return 0;
    });

  const EMPLOYEES_PER_PAGE = 15;
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / EMPLOYEES_PER_PAGE));
  const startIndex = (currentPage - 1) * EMPLOYEES_PER_PAGE;
  const pagedEmployees = filteredEmployees.slice(startIndex, startIndex + EMPLOYEES_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, departmentFilter, sortOrder, month, year]);

  useEffect(() => {
    setCurrentPage(prev => Math.min(prev, totalPages));
  }, [totalPages]);

  const headerFont = { fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' };
  const parseBufferMinutes = value => {
    if (typeof value !== 'string') return 0;
    const [hours, minutes] = value.split(':').map(part => Number(part || 0));
    return Math.max(0, hours * 60 + minutes);
  };
  const formatBufferMinutes = value => {
    const totalMinutes = Math.max(0, Number(value || 0));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const renderPanelContent = (showClose = false) => {
    if (isPanelLoading) {
      return <PanelSkeleton showClose={showClose} />;
    }

    const payroll = selectedEmployee?.payroll;
    const employeeId = selectedEmployee?._id;
    const lateCount = Number(lateCheckInCounts[employeeId] || 0);
    const allowedLateDays = Number(penaltySettings.allowedDays || 0);
    const excessLateDays = Math.max(0, lateCount - allowedLateDays);
    const dailyWage = Number(payroll?.dailyWage || 0);
    const perDayPenalty =
      penaltySettings.method === 'fixed'
        ? Number(penaltySettings.fixedPenaltyPerDay || 0)
        : dailyWage * Number(penaltySettings.dailyWageMultiplier || 0);
    const totalPenalty = excessLateDays * perDayPenalty;
    const configuredOvertimeRate = Number(overtimeSettings.hourlyRate || 0);
    const overtimeFromDailyWage =
      (dailyWage / HOURS_PER_DAY) * Number(overtimeSettings.dailyWageMultiplier || 1);
    const overtimeRate =
      overtimeSettings.rateBasis === 'daily_wage'
        ? overtimeFromDailyWage
        : configuredOvertimeRate > 0
          ? configuredOvertimeRate
          : overtimeFromDailyWage;
    const overtimeHours = Number(payroll?.overtimeHours || 0);
    const overtimeAmount = Number(payroll?.overtimeAmount || 0);
    const extraAmount = getExtraAmountForEmployee(selectedEmployee?._id);
    const snapshotPenaltyAmount = Number(
      payroll?.isPreview ? (autoPenaltyMap[selectedEmployee?._id] ?? 0) : payroll?.penalties || 0
    );
    const snapshotLoanAmount = Number(
      payroll?.isPreview
        ? (loanAdvanceMap[selectedEmployee?._id] ?? payroll?.computedLoanAmount ?? 0)
        : payroll?.loanAmount || 0
    );
    const showPenaltySummary = Boolean(penaltySettings.enabled);

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">
              Payroll Snapshot
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                Overtime Hours
              </label>
              <input
                type="number"
                step="1"
                value={Number.isFinite(overtimeHours) ? overtimeHours : 0}
                disabled
                readOnly
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                Penalties
              </label>
              <input
                type="number"
                step="0.01"
                value={Number.isFinite(snapshotPenaltyAmount) ? snapshotPenaltyAmount : 0}
                disabled
                readOnly
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                Loan Amount
              </label>
              <input
                type="number"
                step="1"
                value={Number.isFinite(snapshotLoanAmount) ? snapshotLoanAmount : 0}
                disabled
                readOnly
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                Extra Amount
              </label>
              <input
                type="number"
                step="1"
                value={Number.isFinite(extraAmount) ? extraAmount : 0}
                disabled
                readOnly
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60"
              />
            </div>
          </div>

          {showPenaltySummary ? (
            <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                Penalty Summary
              </p>
              <div className="flex items-center justify-between text-sm">
                <span>Late Check-ins</span>
                <span>{lateCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Allowed Days</span>
                <span>{allowedLateDays}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Excess Days</span>
                <span>{excessLateDays}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Per-day Penalty</span>
                <span>₹{Number(perDayPenalty || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Total Penalty</span>
                <span>₹{Number(totalPenalty || 0).toFixed(2)}</span>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
              Overtime Summary
            </p>
            <div className="flex items-center justify-between text-sm">
              <span>Overtime Hours</span>
              <span>{overtimeHours.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Overtime Rate</span>
              <span>₹{Number(overtimeRate || 0).toFixed(2)} / hr</span>
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
            {(() => {
              const payroll = selectedEmployee?.payroll;
              const dailyWage = Number(payroll?.dailyWage || 0);
              const fullDays = Number(payroll?.fullDays || 0);
              const halfDays = Number(payroll?.halfDays || 0);
              const paidLeaves = Number(payroll?.paidLeaves || 0);
              const paidLeavesGross = paidLeaves * dailyWage;
              const overtimeAmount = Number(payroll?.overtimeAmount || 0);
              const leaveEncashmentAmount = Number(
                payroll?.leaveEncashmentAmount ?? payroll?.leaveEncashment?.total ?? 0
              );
              const extraAmount = getExtraAmountForEmployee(selectedEmployee?._id);
              const penalties = Number(
                payroll?.isPreview
                  ? (autoPenaltyMap[selectedEmployee?._id] ?? 0)
                  : payroll?.penalties || 0
              );
              const loanAmount = payroll?.isPreview
                ? Number(loanAdvanceMap[selectedEmployee?._id] ?? payroll?.computedLoanAmount ?? 0)
                : Number(payroll?.loanAmount || 0);
              const grossPay =
                fullDays * dailyWage +
                halfDays * dailyWage * 0.5 +
                paidLeaves * dailyWage +
                overtimeAmount +
                extraAmount +
                leaveEncashmentAmount;
              const deductions = penalties + loanAmount;
              const totalSalary = payroll?.isPreview
                ? getPreviewNetPay(selectedEmployee?._id, payroll)
                : Number(payroll?.totalSalary || 0);

              return (
                <>
                  {paidLeavesGross > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span>Paid Leaves Gross</span>
                      <span>₹{paidLeavesGross.toFixed(2)}</span>
                    </div>
                  ) : null}
                  {leaveEncashmentAmount > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span>Leave Encashment</span>
                      <span>₹{leaveEncashmentAmount.toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-sm">
                    <span>Gross Pay</span>
                    <span>₹{grossPay.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Deductions</span>
                    <span>₹{deductions.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Salary</span>
                    <span className="font-semibold">₹{totalSalary.toFixed(2)}</span>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Payslip Branding</h3>
              <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                These assets apply to all generated payslips.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm">Company Logo</label>
              {payslipSettings.logoData ? (
                <div className="flex items-center justify-between gap-3">
                  <img
                    src={payslipSettings.logoData}
                    alt="Company logo preview"
                    className="h-12 max-w-[160px] rounded bg-white object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setPayslipSettings(prev => ({ ...prev, logoData: '' }))}
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="w-full text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Authorized Signature</label>
              {payslipSettings.signatureData ? (
                <div className="flex items-center justify-between gap-3">
                  <img
                    src={payslipSettings.signatureData}
                    alt="Signature preview"
                    className="h-12 max-w-[160px] rounded bg-white object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setPayslipSettings(prev => ({ ...prev, signatureData: '' }))}
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureChange}
                className="w-full text-xs"
              />
            </div>

            <button
              type="button"
              onClick={savePayslipSettings}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border"
              disabled={isSavingPayslipSettings}
            >
              {isSavingPayslipSettings ? 'Saving...' : 'Save Payslip Branding'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={processPayroll}
            disabled={!isSelectedMonthClosed || isPayrollPaidLocked}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator className="w-4 h-4" />
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
          <button
            onClick={downloadPayslipPdf}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border"
          >
            <Download className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <SalaryDashboardSkeleton />
        <ToastContainer
          theme={theme}
          position="top-right"
          pauseOnHover={false}
          limit={1}
          autoClose={2000}
        />
      </>
    );
  }

  return (
    <div
      className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text"
      style={headerFont}
    >
      <div className="max-w-7xl mx-auto">
        <Header
          title="Payroll"
          description="Review payroll runs, adjust deductions, and export reports."
          icon={<Calculator className="w-8 h-8 text-primary" />}
        />

        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-col">
                <label className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">
                  From
                </label>
                <input
                  type="date"
                  value={toInputDate(
                    rangeStart.getFullYear(),
                    rangeStart.getMonth() + 1,
                    rangeStart.getDate()
                  )}
                  onChange={e => {
                    const date = new Date(e.target.value);
                    if (!Number.isNaN(date.getTime())) {
                      setMonth(date.getMonth() + 1);
                      setYear(date.getFullYear());
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">
                  To
                </label>
                <input
                  type="date"
                  value={toInputDate(
                    rangeEnd.getFullYear(),
                    rangeEnd.getMonth() + 1,
                    rangeEnd.getDate()
                  )}
                  onChange={e => {
                    const date = new Date(e.target.value);
                    if (!Number.isNaN(date.getTime())) {
                      setMonth(date.getMonth() + 1);
                      setYear(date.getFullYear());
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
                />
              </div>
              <button
                className="self-end px-5 py-2 rounded-lg bg-primary text-white"
                aria-label="Search payroll range"
              >
                Search
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportPayrollCsv}
                className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
              >
                Export CSV
              </button>
              <button
                onClick={exportPayrollPdf}
                className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
              >
                Export PDF
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-light-text dark:text-dark-text" />
              <input
                type="text"
                placeholder="Search by name, email, ID, or role..."
                className="w-full pl-12 pr-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-light-text/50 dark:placeholder:text-dark-text/50 text-light-text dark:text-dark-text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search employees"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
                aria-label="Filter by payroll status"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
                aria-label="Select month"
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
                className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
                aria-label="Select year"
              >
                {Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index).map(
                  value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  )
                )}
              </select>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(prev => !prev)}
                  className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card flex items-center gap-2"
                  aria-label="Open filters"
                >
                  <Filter className="w-4 h-4" />
                  {departmentFilter === 'all' ? 'Filters' : `Department: ${departmentFilter}`}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-lg z-10">
                    <button
                      type="button"
                      onClick={() => {
                        setDepartmentFilter('all');
                        setIsFilterOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 ${departmentFilter === 'all' ? 'bg-light-bg/70 dark:bg-dark-bg/70' : ''}`}
                    >
                      All Departments
                    </button>
                    {departmentOptions.map(department => (
                      <button
                        key={department}
                        type="button"
                        onClick={() => {
                          setDepartmentFilter(department);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-light-bg/70 dark:hover:bg-dark-bg/70 ${departmentFilter === department ? 'bg-light-bg/70 dark:bg-dark-bg/70' : ''}`}
                      >
                        {department}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative group/table">
          <div
            ref={salaryTableScrollRef}
            className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
          >
            <table className="min-w-full text-sm">
              <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Emp ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">Designation</th>
                  <th className="px-4 py-3 text-left font-semibold">Full Day</th>
                  <th className="px-4 py-3 text-left font-semibold">Half Day</th>
                  <th className="px-4 py-3 text-left font-semibold">Paid Leaves</th>
                  <th className="px-4 py-3 text-left font-semibold">Unpaid Days</th>
                  <th className="px-4 py-3 text-left font-semibold">Daily Wage</th>
                  <th className="px-4 py-3 text-left font-semibold">Gross Wage</th>
                  <th className="px-4 py-3 text-left font-semibold">Base Salary (Master)</th>
                  <th className="px-4 py-3 text-left font-semibold align-middle">
                    <button
                      type="button"
                      onClick={() => setSettingsPanel('overtime')}
                      className="inline-flex items-center p-0 leading-tight underline decoration-dotted"
                    >
                      Overtime
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold align-middle">
                    <button
                      type="button"
                      onClick={() => setSettingsPanel('penalties')}
                      className="inline-flex items-center p-0 leading-tight underline decoration-dotted"
                    >
                      Penalties
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold align-middle">
                    <button
                      type="button"
                      onClick={() => setSettingsPanel('loans')}
                      className="inline-flex items-center p-0 leading-tight underline decoration-dotted"
                    >
                      Loan & Advance
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold align-middle">
                    <button
                      type="button"
                      onClick={() => setSettingsPanel('extras')}
                      className="inline-flex items-center p-0 leading-tight underline decoration-dotted"
                    >
                      Extras
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Net Pay</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedEmployees.map(employee => {
                  const payroll = mergedPayrollMap[employee._id] || {};
                  const baseSalary = Number(
                    payroll.baseSalary || getEmployeeSalary(employee.email) || 0
                  );
                  const overtime = Number(payroll.overtimeAmount || 0);
                  const penalties = Number(
                    payroll.isPreview ? (autoPenaltyMap[employee._id] ?? 0) : payroll.penalties || 0
                  );
                  const loanAmount = Number(
                    payroll.isPreview
                      ? (loanAdvanceMap[employee._id] ?? payroll.computedLoanAmount ?? 0)
                      : payroll.loanAmount || 0
                  );
                  const employeeExtras = getExtrasForEmployee(employee._id);
                  const extraSourceSummary = getExtraSourceSummary(employeeExtras);
                  const extras = Number(getExtraAmountForEmployee(employee._id) || 0);
                  const extraSourceLabels = [
                    extraSourceSummary.sundayCompensation.count > 0 ? 'Sunday Compensation' : null,
                    extraSourceSummary.manual.count > 0 ? 'Manual Extras' : null,
                  ].filter(Boolean);
                  const grossWage =
                    Number(payroll.dailyWage || 0) *
                    (Number(payroll.fullDays || 0) + Number(payroll.halfDays || 0) * 0.5);
                  const netPay = Number(
                    payroll.isPreview
                      ? getPreviewNetPay(employee._id, payroll)
                      : payroll.totalSalary || 0
                  );

                  return (
                    <tr
                      key={employee._id}
                      className="border-t border-light-border/70 dark:border-dark-border/70 hover:bg-light-bg/40 dark:hover:bg-dark-bg/40"
                    >
                      <td className="px-4 py-3 text-light-text/70 dark:text-dark-text/70">
                        {employee.employeeCode || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-light-text dark:text-dark-text">
                          {employee.name}
                        </div>
                        <div className="text-xs text-light-text/60 dark:text-dark-text/60">
                          {employee.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-light-text/70 dark:text-dark-text/70">
                        {employee.department || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-light-text/70 dark:text-dark-text/70">
                        {employee.designation || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openAttendanceMasterForEmployee(employee)}
                          className="text-left underline decoration-dotted"
                          aria-label={`Open attendance master for ${employee.name} full days`}
                        >
                          {payroll.fullDays || 0}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openAttendanceMasterForEmployee(employee)}
                          className="text-left underline decoration-dotted"
                          aria-label={`Open attendance master for ${employee.name} half days`}
                        >
                          {payroll.halfDays || 0}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={event => openPaidLeavesPanel(employee, event)}
                          className="text-left underline decoration-dotted"
                          aria-label={`Open paid leave panel for ${employee.name}`}
                        >
                          {payroll.paidLeaves || 0}
                        </button>
                      </td>
                      <td className="px-4 py-3">{payroll.unpaidDays || 0}</td>
                      <td className="px-4 py-3">₹{Number(payroll.dailyWage || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">₹{grossWage.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/dashboard/salaries/${employee._id}`)}
                          className="text-left underline decoration-dotted"
                          aria-label={`Open salary profile for ${employee.name}`}
                        >
                          ₹{baseSalary.toFixed(2)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={event => openPanel(employee, event)}
                          className="text-left underline decoration-dotted"
                          aria-label={`Open payroll snapshot for ${employee.name}`}
                        >
                          ₹{overtime.toFixed(2)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={event => openPanel(employee, event)}
                          className="text-left underline decoration-dotted"
                          aria-label={`Open payroll snapshot for ${employee.name}`}
                        >
                          ₹{penalties.toFixed(2)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={event => openLoansPanel(employee, event)}
                          className="text-left underline decoration-dotted"
                          aria-label={`Open loan panel for ${employee.name}`}
                        >
                          ₹{loanAmount.toFixed(2)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          return (
                            <button
                              type="button"
                              onClick={event => openExtrasPanel(employee, event)}
                              className="text-left underline decoration-dotted"
                              aria-label={`Open extras panel for ${employee.name}`}
                            >
                              <span className="flex flex-col items-start leading-tight">
                                <span>₹{extras.toFixed(2)}</span>
                                {extraSourceLabels.length > 0 ? (
                                  <span className="text-[11px] font-medium text-info">
                                    {extraSourceLabels.join(' + ')}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 font-semibold">₹{netPay.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            payroll.status === 'paid'
                              ? 'bg-success/20 text-success'
                              : 'bg-warning/20 text-warning'
                          }`}
                        >
                          {payroll.status || 'unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openPanel(employee)}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-light-border dark:border-dark-border bg-white/70 dark:bg-dark-card/70"
                          >
                            <Calculator className="w-4 h-4" />
                            Payroll
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            className="absolute left-0 top-0 bottom-0 z-10 w-12 cursor-w-resize"
            onMouseEnter={() => startSalaryTableAutoScroll('left')}
            onMouseLeave={stopSalaryTableAutoScroll}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-0 bottom-0 z-10 w-12 cursor-e-resize"
            onMouseEnter={() => startSalaryTableAutoScroll('right')}
            onMouseLeave={stopSalaryTableAutoScroll}
            aria-hidden="true"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-light-text/70 dark:text-dark-text/70">
          <div>
            {filteredEmployees.length > 0
              ? `Showing ${startIndex + 1}-${Math.min(
                  startIndex + EMPLOYEES_PER_PAGE,
                  filteredEmployees.length
                )} of ${filteredEmployees.length}`
              : 'Showing 0 results'}
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

      {isPanelMounted && selectedEmployee && (
        <div
          className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${isPanelVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={closePanel}
          role="presentation"
        >
          <div
            className={`absolute right-0 top-0 h-full w-full max-w-xl bg-light-bg dark:bg-dark-bg p-6 shadow-2xl overflow-y-auto transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${isPanelVisible ? 'translate-x-0' : 'translate-x-full'}`}
            onClick={event => event.stopPropagation()}
            role="presentation"
          >
            {renderPanelContent(true)}
          </div>
        </div>
      )}

      {isSettingsPanelMounted && settingsPanel && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          style={{
            opacity: isSettingsPanelVisible ? 1 : 0,
            pointerEvents: isSettingsPanelVisible ? 'auto' : 'none',
            transition: 'opacity 300ms ease',
          }}
          onClick={() => setSettingsPanel(null)}
          role="presentation"
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-lg bg-light-bg dark:bg-dark-bg p-6 shadow-2xl overflow-y-auto will-change-transform"
            style={{
              transform: isSettingsPanelVisible
                ? 'translate3d(0, 0, 0)'
                : 'translate3d(100%, 0, 0)',
              transition: 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={event => event.stopPropagation()}
            role="presentation"
          >
            <div
              className="transform-gpu"
              style={{
                opacity: isSettingsContentVisible ? 1 : 0,
                transform: isSettingsContentVisible
                  ? 'translate3d(0, 0, 0)'
                  : 'translate3d(12px, 0, 0)',
                transition: 'opacity 240ms ease, transform 240ms ease',
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">
                    Payroll Settings
                  </p>
                  <h2 className="text-xl font-semibold">
                    {settingsPanel === 'overtime'
                      ? 'Overtime Pay Settings'
                      : settingsPanel === 'penalties'
                        ? 'Penalty Settings'
                        : settingsPanel === 'loans'
                          ? 'Add Loan/Advance'
                          : settingsPanel === 'paidLeaves'
                            ? 'Paid Leave Summary'
                            : 'Add Extra Allowance'}
                  </h2>
                </div>
                <button onClick={() => setSettingsPanel(null)} aria-label="Close payroll settings">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {settingsPanel === 'overtime' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Overtime Rate Basis
                      </label>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="overtimeRateBasis"
                            value="fixed"
                            checked={overtimeSettings.rateBasis === 'fixed'}
                            onChange={() =>
                              setOvertimeSettings(prev => ({ ...prev, rateBasis: 'fixed' }))
                            }
                          />
                          Fixed Per Hour
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="overtimeRateBasis"
                            value="daily_wage"
                            checked={overtimeSettings.rateBasis === 'daily_wage'}
                            onChange={() =>
                              setOvertimeSettings(prev => ({ ...prev, rateBasis: 'daily_wage' }))
                            }
                          />
                          Based on Daily Wage
                        </label>
                      </div>
                    </div>

                    {overtimeSettings.rateBasis === 'fixed' && (
                      <div>
                        <label className="text-sm font-medium text-light-text dark:text-dark-text">
                          Fixed Per Hour Pay
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={overtimeSettings.hourlyRate}
                          onChange={e =>
                            setOvertimeSettings(prev => ({
                              ...prev,
                              hourlyRate: Number(e.target.value),
                            }))
                          }
                          onFocus={e => e.target.select()}
                          onWheel={e => e.currentTarget.blur()}
                          className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                        />
                        <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-2">
                          Used when overtime basis is set to Fixed Per Hour.
                        </p>
                      </div>
                    )}
                    {overtimeSettings.rateBasis === 'daily_wage' && (
                      <div>
                        <label className="text-sm font-medium text-light-text dark:text-dark-text">
                          Daily Wage Multiplier
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={overtimeSettings.dailyWageMultiplier}
                          onChange={e =>
                            setOvertimeSettings(prev => ({
                              ...prev,
                              dailyWageMultiplier: Number(e.target.value),
                            }))
                          }
                          onFocus={e => e.target.select()}
                          onWheel={e => e.currentTarget.blur()}
                          className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                        />
                        <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-2">
                          Overtime rate per hour = (Daily wage / {HOURS_PER_DAY}) x multiplier.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Buffer Period
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={parseBufferMinutes(overtimeSettings.bufferMinutes)}
                        onChange={e =>
                          setOvertimeSettings(prev => ({
                            ...prev,
                            bufferMinutes: formatBufferMinutes(e.target.value),
                          }))
                        }
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                      <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-2">
                        Grace minutes before overtime starts
                      </p>
                    </div>
                  </>
                )}

                {settingsPanel === 'penalties' && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Late Coming Penalty
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={penaltySettings.enabled}
                          onChange={e =>
                            setPenaltySettings(prev => ({ ...prev, enabled: e.target.checked }))
                          }
                        />
                        <div className="w-10 h-6 bg-light-border dark:bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:bg-primary transition-colors"></div>
                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></span>
                      </label>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Allowed Days
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={penaltySettings.allowedDays}
                        onChange={e =>
                          setPenaltySettings(prev => ({
                            ...prev,
                            allowedDays: Number(e.target.value),
                          }))
                        }
                        disabled={!penaltySettings.enabled}
                        onFocus={e => e.target.select()}
                        onWheel={e => e.currentTarget.blur()}
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Penalty Method
                      </label>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="penaltyMethod"
                            value="fixed"
                            checked={penaltySettings.method === 'fixed'}
                            onChange={() =>
                              setPenaltySettings(prev => ({ ...prev, method: 'fixed' }))
                            }
                            disabled={!penaltySettings.enabled}
                          />
                          Fixed Penalty Per Day
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="penaltyMethod"
                            value="multiplier"
                            checked={penaltySettings.method === 'multiplier'}
                            onChange={() =>
                              setPenaltySettings(prev => ({ ...prev, method: 'multiplier' }))
                            }
                            disabled={!penaltySettings.enabled}
                          />
                          Multiplier of Daily Wage
                        </label>
                      </div>
                    </div>

                    {penaltySettings.method === 'fixed' ? (
                      <div>
                        <label className="text-sm font-medium text-light-text dark:text-dark-text">
                          Fixed Penalty Per Day
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={penaltySettings.fixedPenaltyPerDay}
                          onChange={e =>
                            setPenaltySettings(prev => ({
                              ...prev,
                              fixedPenaltyPerDay: Number(e.target.value),
                            }))
                          }
                          disabled={!penaltySettings.enabled}
                          onFocus={e => e.target.select()}
                          onWheel={e => e.currentTarget.blur()}
                          className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-light-text dark:text-dark-text">
                          Multiply Daily Wage With
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={penaltySettings.dailyWageMultiplier}
                          onChange={e =>
                            setPenaltySettings(prev => ({
                              ...prev,
                              dailyWageMultiplier: Number(e.target.value),
                            }))
                          }
                          disabled={!penaltySettings.enabled}
                          onFocus={e => e.target.select()}
                          onWheel={e => e.currentTarget.blur()}
                          className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Grace Time
                      </label>
                      <input
                        type="time"
                        value={penaltySettings.graceTime}
                        onChange={e =>
                          setPenaltySettings(prev => ({
                            ...prev,
                            graceTime: e.target.value,
                          }))
                        }
                        disabled={!penaltySettings.enabled}
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-2">
                        Flexible window before employees are considered late
                      </p>
                    </div>
                  </>
                )}

                {settingsPanel === 'loans' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Employee
                      </label>
                      <select
                        value={loanForm.employeeId}
                        onChange={e =>
                          setLoanForm(prev => ({ ...prev, employeeId: e.target.value }))
                        }
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      >
                        <option value="">Select employee</option>
                        {employees.map(employee => (
                          <option key={employee._id} value={employee._id}>
                            {employee.name}{' '}
                            {employee.employeeCode ? `(${employee.employeeCode})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Refer Loan/Advance as
                      </label>
                      <input
                        type="text"
                        value={loanForm.reference}
                        onChange={e =>
                          setLoanForm(prev => ({ ...prev, reference: e.target.value }))
                        }
                        placeholder="Medical"
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={loanForm.amount}
                        onChange={e => setLoanForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter Amount"
                        onFocus={e => e.target.select()}
                        onWheel={e => e.currentTarget.blur()}
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Type
                      </label>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="loanType"
                            value="loan"
                            checked={loanForm.type === 'loan'}
                            onChange={() => setLoanForm(prev => ({ ...prev, type: 'loan' }))}
                          />
                          Loan
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="loanType"
                            value="advance"
                            checked={loanForm.type === 'advance'}
                            onChange={() =>
                              setLoanForm(prev => ({
                                ...prev,
                                type: 'advance',
                                installmentType: 'monthly',
                                monthlyInstallment: '',
                                tenureMonths: '',
                              }))
                            }
                          />
                          Advance Payment
                        </label>
                      </div>
                    </div>

                    {loanForm.type === 'loan' ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-light-text dark:text-dark-text">
                            Installment Type
                          </label>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="installmentType"
                                value="monthly"
                                checked={loanForm.installmentType === 'monthly'}
                                onChange={() =>
                                  setLoanForm(prev => ({ ...prev, installmentType: 'monthly' }))
                                }
                              />
                              Monthly installment
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="installmentType"
                                value="tenure"
                                checked={loanForm.installmentType === 'tenure'}
                                onChange={() =>
                                  setLoanForm(prev => ({ ...prev, installmentType: 'tenure' }))
                                }
                              />
                              Tenure
                            </label>
                          </div>
                        </div>

                        {loanForm.installmentType === 'monthly' ? (
                          <div>
                            <label className="text-sm font-medium text-light-text dark:text-dark-text">
                              Monthly Installment
                            </label>
                            <input
                              type="number"
                              step="1"
                              value={loanForm.monthlyInstallment}
                              onChange={e =>
                                setLoanForm(prev => ({
                                  ...prev,
                                  monthlyInstallment: e.target.value,
                                }))
                              }
                              placeholder="Enter Amount"
                              onFocus={e => e.target.select()}
                              onWheel={e => e.currentTarget.blur()}
                              className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="text-sm font-medium text-light-text dark:text-dark-text">
                              Tenure (Months)
                            </label>
                            <input
                              type="number"
                              step="1"
                              value={loanForm.tenureMonths}
                              onChange={e =>
                                setLoanForm(prev => ({ ...prev, tenureMonths: e.target.value }))
                              }
                              placeholder="Enter months"
                              onFocus={e => e.target.select()}
                              onWheel={e => e.currentTarget.blur()}
                              className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                            />
                          </div>
                        )}
                      </>
                    ) : null}

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Transaction Date
                      </label>
                      <input
                        type="date"
                        value={loanForm.transactionDate}
                        onChange={e =>
                          setLoanForm(prev => ({ ...prev, transactionDate: e.target.value }))
                        }
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Comment
                      </label>
                      <textarea
                        value={loanForm.comment}
                        onChange={e => setLoanForm(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder=""
                        rows={3}
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                    </div>

                    <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col">
                          <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                            Filter
                          </label>
                          <select
                            value={loanFilterMode}
                            onChange={e => setLoanFilterMode(e.target.value)}
                            className="mt-2 w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                          >
                            <option value="all">All Months</option>
                            <option value="month">Specific Month</option>
                          </select>
                        </div>
                        {loanFilterMode === 'month' ? (
                          <>
                            <div className="flex flex-col">
                              <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                                Month
                              </label>
                              <select
                                value={loanFilterMonth}
                                onChange={e => setLoanFilterMonth(Number(e.target.value))}
                                className="mt-2 w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                              >
                                {Array.from({ length: 12 }, (_, index) => (
                                  <option key={index + 1} value={index + 1}>
                                    {new Date(0, index).toLocaleString('default', {
                                      month: 'long',
                                    })}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                                Year
                              </label>
                              <select
                                value={loanFilterYear}
                                onChange={e => setLoanFilterYear(Number(e.target.value))}
                                className="mt-2 w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                              >
                                {Array.from(
                                  { length: 6 },
                                  (_, index) => new Date().getFullYear() - index
                                ).map(value => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold">
                            {loanDetails?.employee?.name || 'Loans & Advances'}
                          </h3>
                          <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                            Loan & Advance
                          </p>
                          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                            {loanDetails?.employee?.employeeCode || 'N/A'}
                            {loanDetails?.employee?.email ? ` · ${loanDetails.employee.email}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                            Total Amount
                          </p>
                          <p className="text-lg font-semibold">
                            ₹{(loanDetails?.total || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                            {loanDetails?.count || 0} items
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold">Date</th>
                              <th className="px-4 py-3 text-left font-semibold">Type</th>
                              <th className="px-4 py-3 text-left font-semibold">Amount</th>
                              <th className="px-4 py-3 text-left font-semibold">Status</th>
                              <th className="px-4 py-3 text-left font-semibold">Reference</th>
                              <th className="px-4 py-3 text-left font-semibold">Installment</th>
                              <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!loanDetails ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-4 py-6 text-center text-light-text/60 dark:text-dark-text/60"
                                >
                                  Select an employee to view loan history.
                                </td>
                              </tr>
                            ) : loanDetails.records.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-4 py-6 text-center text-light-text/60 dark:text-dark-text/60"
                                >
                                  No loan or advance records for this period.
                                </td>
                              </tr>
                            ) : (
                              loanDetails.records.map(record => (
                                <tr
                                  key={record._id}
                                  className="border-t border-light-border/70 dark:border-dark-border/70"
                                >
                                  <td className="px-4 py-3">
                                    {record.transactionDate
                                      ? new Date(record.transactionDate).toLocaleDateString(
                                          'en-IN',
                                          {
                                            timeZone: 'Asia/Kolkata',
                                          }
                                        )
                                      : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3">{record.type || 'N/A'}</td>
                                  <td className="px-4 py-3">
                                    ₹{Number(record.amount || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {(() => {
                                      const status = getLoanScheduleStatus(record, month, year);
                                      const statusClass =
                                        status === 'completed'
                                          ? 'bg-success/20 text-success'
                                          : status === 'cancelled'
                                            ? 'bg-danger/20 text-danger'
                                            : 'bg-warning/20 text-warning';

                                      return (
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}
                                        >
                                          {status}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-4 py-3">{record.reference || 'N/A'}</td>
                                  <td className="px-4 py-3">
                                    {record.type === 'advance'
                                      ? 'One-time'
                                      : record.installmentType === 'monthly'
                                        ? `₹${Number(record.monthlyInstallment || 0).toFixed(2)}`
                                        : record.tenureMonths
                                          ? `${record.tenureMonths} months`
                                          : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3">{record.comment || '—'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {settingsPanel === 'paidLeaves' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold">
                            {paidLeaveDetails?.employee?.name || 'Paid Leaves'}
                          </h3>
                          <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                            Paid Leave Summary
                          </p>
                          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                            {paidLeaveDetails?.employee?.employeeCode || 'N/A'}
                            {paidLeaveDetails?.employee?.email
                              ? ` · ${paidLeaveDetails.employee.email}`
                              : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                            Paid Leaves
                          </p>
                          <p className="text-lg font-semibold">
                            {Number(paidLeaveDetails?.paidLeaves || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-light-border/70 dark:border-dark-border/70 bg-white/70 dark:bg-dark-card/70 px-4 py-3 space-y-1">
                          <p className="text-xs uppercase tracking-[0.12em] text-info/70">
                            Paid Leaves Gross
                          </p>
                          <p className="text-lg font-semibold text-info">
                            ₹{Number(paidLeaveDetails?.paidLeavesGross || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                            {Number(paidLeaveDetails?.paidLeaves || 0)} day(s) × ₹
                            {Number(paidLeaveDetails?.dailyWage || 0).toFixed(2)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-light-border/70 dark:border-dark-border/70 bg-white/70 dark:bg-dark-card/70 px-4 py-3 space-y-1">
                          <p className="text-xs uppercase tracking-[0.12em] text-warning/70">
                            Leave Encashment
                          </p>
                          <p className="text-lg font-semibold text-warning">
                            ₹{Number(paidLeaveDetails?.encashmentSummary?.amount || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                            {Number(paidLeaveDetails?.encashmentSummary?.count || 0)} record(s)
                            {paidLeaveDetails?.encashmentSummary?.days
                              ? ` · ${Number(paidLeaveDetails.encashmentSummary.days)} day(s)`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                            Approved Paid Leave Requests
                          </p>
                          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                            These are the approved leave requests counted as paid leave in payroll.
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold">Date</th>
                              <th className="px-4 py-3 text-left font-semibold">Days</th>
                              <th className="px-4 py-3 text-left font-semibold">Type</th>
                              <th className="px-4 py-3 text-left font-semibold">Amount</th>
                              <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!paidLeaveDetails ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-4 py-6 text-center text-light-text/60 dark:text-dark-text/60"
                                >
                                  Select an employee to view paid leave details.
                                </td>
                              </tr>
                            ) : (paidLeaveDetails.leaveRecords || []).length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-4 py-6 text-center text-light-text/60 dark:text-dark-text/60"
                                >
                                  No approved paid leave requests for this period.
                                </td>
                              </tr>
                            ) : (
                              (paidLeaveDetails.leaveRecords || []).map(record => {
                                const paidDayAmount =
                                  Number(record.paidDays || 0) *
                                  Number(paidLeaveDetails?.dailyWage || 0);

                                return (
                                  <tr
                                    key={record._id}
                                    className="border-t border-light-border/70 dark:border-dark-border/70"
                                  >
                                    <td className="px-4 py-3">
                                      {record.startDate
                                        ? new Date(record.startDate).toLocaleDateString('en-IN', {
                                            timeZone: 'Asia/Kolkata',
                                          })
                                        : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3">{Number(record.paidDays || 0)}</td>
                                    <td className="px-4 py-3">{record.leaveMode || 'N/A'}</td>
                                    <td className="px-4 py-3">₹{paidDayAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3">{record.reason || '—'}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Date</th>
                            <th className="px-4 py-3 text-left font-semibold">Days</th>
                            <th className="px-4 py-3 text-left font-semibold">Rate / Day</th>
                            <th className="px-4 py-3 text-left font-semibold">Amount</th>
                            <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!paidLeaveDetails?.encashmentRecords?.length ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-6 text-center text-light-text/60 dark:text-dark-text/60"
                              >
                                No leave encashment records for this period.
                              </td>
                            </tr>
                          ) : (
                            paidLeaveDetails.encashmentRecords.map(record => (
                              <tr
                                key={record._id}
                                className="border-t border-light-border/70 dark:border-dark-border/70"
                              >
                                <td className="px-4 py-3">
                                  {record.transactionDate
                                    ? new Date(record.transactionDate).toLocaleDateString('en-IN', {
                                        timeZone: 'Asia/Kolkata',
                                      })
                                    : 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  {Number(record.breakdown?.encashmentDays || 0)}
                                </td>
                                <td className="px-4 py-3">
                                  ₹{Number(record.breakdown?.ratePerDay || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                  ₹{Number(record.amount || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3">{record.comment || '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {settingsPanel === 'extras' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Employee
                      </label>
                      <select
                        value={extraForm.employeeId}
                        onChange={e =>
                          setExtraForm(prev => ({ ...prev, employeeId: e.target.value }))
                        }
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      >
                        <option value="">Select employee</option>
                        {employees.map(employee => (
                          <option key={employee._id} value={employee._id}>
                            {employee.name}{' '}
                            {employee.employeeCode ? `(${employee.employeeCode})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Refer Extra as
                      </label>
                      <input
                        type="text"
                        value={extraForm.reference}
                        onChange={e =>
                          setExtraForm(prev => ({ ...prev, reference: e.target.value }))
                        }
                        placeholder="Bonus"
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={extraForm.amount}
                        onChange={e => setExtraForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter Amount"
                        onFocus={e => e.target.select()}
                        onWheel={e => e.currentTarget.blur()}
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Transaction Date
                      </label>
                      <input
                        type="date"
                        value={extraForm.transactionDate}
                        onChange={e =>
                          setExtraForm(prev => ({ ...prev, transactionDate: e.target.value }))
                        }
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-light-text dark:text-dark-text">
                        Comment
                      </label>
                      <textarea
                        value={extraForm.comment}
                        onChange={e => setExtraForm(prev => ({ ...prev, comment: e.target.value }))}
                        rows={3}
                        className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                      />
                    </div>

                    <div className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold">
                            {extraDetails?.employee?.name || 'Extras'}
                          </h3>
                          <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                            Extras
                          </p>
                          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                            {extraDetails?.employee?.employeeCode || 'N/A'}
                            {extraDetails?.employee?.email
                              ? ` · ${extraDetails.employee.email}`
                              : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
                            Total Extras
                          </p>
                          <p className="text-lg font-semibold">
                            ₹{(extraDetails?.total || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                            {extraDetails?.count || 0} items
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-info/20 bg-info/5 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-info/70">
                              Extras Source Summary
                            </p>
                            <p className="text-sm text-light-text/60 dark:text-dark-text/60">
                              Clear source-wise breakdown of the extras shown here. Leave encashment
                              is shown in Paid Leaves.
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.12em] text-info/70">
                              Total Extras
                            </p>
                            <p className="text-lg font-semibold text-info">
                              ₹{(extraDetails?.total || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {(() => {
                          const sourceSummary = getExtraSourceSummary(extraDetails?.records || []);
                          const manualTypes = Object.entries(sourceSummary.manual.byType || {});
                          const hasAnySources =
                            sourceSummary.sundayCompensation.count > 0 ||
                            sourceSummary.manual.count > 0;

                          if (!hasAnySources) {
                            return (
                              <div className="rounded-lg border border-dashed border-info/30 bg-white/50 dark:bg-dark-card/50 px-4 py-3 text-sm text-light-text/60 dark:text-dark-text/60">
                                No extra sources are linked to this month yet.
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {sourceSummary.sundayCompensation.count > 0 ? (
                                <div className="rounded-lg border border-light-border/70 dark:border-dark-border/70 bg-white/70 dark:bg-dark-card/70 px-4 py-3 flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-semibold text-light-text dark:text-dark-text">
                                      Sunday Compensation
                                    </p>
                                    <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                                      Auto-added for Sunday attendance with check-in and check-out.
                                    </p>
                                    <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-1">
                                      {getRecordMonthLabel(
                                        sourceSummary.sundayCompensation.records[0]
                                      )}
                                    </p>
                                    <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-1">
                                      {sourceSummary.sundayCompensation.count} record(s)
                                    </p>
                                  </div>
                                  <p className="text-lg font-semibold text-success">
                                    ₹{sourceSummary.sundayCompensation.amount.toFixed(2)}
                                  </p>
                                </div>
                              ) : null}

                              {sourceSummary.manual.count > 0 ? (
                                <div className="rounded-lg border border-light-border/70 dark:border-dark-border/70 bg-white/70 dark:bg-dark-card/70 px-4 py-3 space-y-2">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="text-sm font-semibold text-light-text dark:text-dark-text">
                                        Manual Extras
                                      </p>
                                      <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                                        Added manually by payroll/admin.
                                      </p>
                                      <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-1">
                                        {manualTypes.map(([label, item]) => (
                                          <span key={label} className="mr-3 inline-block">
                                            {label}: {getRecordMonthLabel(item.records[0])}
                                          </span>
                                        ))}
                                      </p>
                                    </div>
                                    <p className="text-lg font-semibold text-warning">
                                      ₹{sourceSummary.manual.amount.toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="space-y-1 text-xs text-light-text/70 dark:text-dark-text/70">
                                    {manualTypes.map(([label, item]) => (
                                      <div
                                        key={label}
                                        className="flex items-center justify-between gap-3"
                                      >
                                        <span>{label}</span>
                                        <span>
                                          ₹{Number(item.amount || 0).toFixed(2)} · {item.count}{' '}
                                          item(s)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold">Date</th>
                              <th className="px-4 py-3 text-left font-semibold">Type</th>
                              <th className="px-4 py-3 text-left font-semibold">Amount</th>
                              <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!extraDetails ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-6 text-center text-light-text/60 dark:text-dark-text/60"
                                >
                                  Select an employee to view extras.
                                </td>
                              </tr>
                            ) : extraDetails.records.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-6 text-center text-light-text/60 dark:text-dark-text/60"
                                >
                                  No extras recorded for this period.
                                </td>
                              </tr>
                            ) : (
                              extraDetails.records.map(record => (
                                <tr
                                  key={record._id}
                                  className="border-t border-light-border/70 dark:border-dark-border/70"
                                >
                                  <td className="px-4 py-3">
                                    {record.transactionDate
                                      ? new Date(record.transactionDate).toLocaleDateString(
                                          'en-IN',
                                          {
                                            timeZone: 'Asia/Kolkata',
                                          }
                                        )
                                      : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span>{getExtraSourceLabel(record)}</span>
                                      <span className="text-[11px] text-light-text/50 dark:text-dark-text/50">
                                        {getExtraSourcePeriodLabel(record)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    ₹{Number(record.amount || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {record.reference === 'Compensation'
                                      ? `${record.comment || 'Sunday attendance'}`
                                      : record.comment || '—'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                {settingsPanel === 'loans' || settingsPanel === 'extras' ? (
                  <>
                    <button
                      onClick={() => setSettingsPanel(null)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-light-border dark:border-dark-border"
                    >
                      Close
                    </button>
                    <button
                      onClick={saveSettingsPanel}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white"
                    >
                      Save Details
                    </button>
                  </>
                ) : settingsPanel === 'paidLeaves' ? (
                  <button
                    onClick={() => setSettingsPanel(null)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-light-border dark:border-dark-border"
                  >
                    Close
                  </button>
                ) : (
                  <button
                    onClick={saveSettingsPanel}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white"
                  >
                    Save
                  </button>
                )}
              </div>
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

const SalaryDashboardSkeleton = () => (
  <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-6 space-y-4">
        <div className="h-5 w-32 rounded bg-light-bg dark:bg-dark-bg" />
        <div className="h-8 w-72 rounded bg-light-bg dark:bg-dark-bg" />
        <div className="h-4 w-96 max-w-full rounded bg-light-bg dark:bg-dark-bg" />
      </div>

      <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="h-10 rounded-lg bg-light-bg dark:bg-dark-bg" />
          <div className="h-10 rounded-lg bg-light-bg dark:bg-dark-bg" />
          <div className="h-10 rounded-lg bg-light-bg dark:bg-dark-bg" />
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="h-11 rounded-lg bg-light-bg dark:bg-dark-bg" />
          <div className="h-11 rounded-lg bg-light-bg dark:bg-dark-bg" />
          <div className="h-11 rounded-lg bg-light-bg dark:bg-dark-bg" />
          <div className="h-11 rounded-lg bg-light-bg dark:bg-dark-bg" />
        </div>
      </div>

      <div className="rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-light-bg/70 dark:bg-dark-bg/70">
              <tr>
                {[...Array(16)].map((_, index) => (
                  <th key={index} className="px-4 py-3 text-left">
                    <div className="h-3 rounded bg-light-bg dark:bg-dark-bg" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(7)].map((_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-t border-light-border/70 dark:border-dark-border/70"
                >
                  {[...Array(16)].map((__, colIndex) => (
                    <td key={colIndex} className="px-4 py-4">
                      <div className="h-4 rounded bg-light-bg dark:bg-dark-bg" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

const PanelSkeleton = ({ showClose = false }) => (
  <div className="space-y-5 animate-pulse">
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded bg-light-card dark:bg-dark-card" />
        <div className="h-6 w-56 rounded bg-light-card dark:bg-dark-card" />
        <div className="h-4 w-40 rounded bg-light-card dark:bg-dark-card" />
      </div>
      {showClose ? <div className="h-9 w-9 rounded-full bg-light-card dark:bg-dark-card" /> : null}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {['Overtime', 'Penalties', 'Loan', 'Extras'].map(label => (
        <div
          key={label}
          className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-3 bg-light-card/40 dark:bg-dark-card/40"
        >
          <div className="h-3 w-20 rounded bg-light-card dark:bg-dark-card" />
          <div className="space-y-2">
            <div className="h-2.5 w-3/4 rounded bg-light-card dark:bg-dark-card" />
            <div className="h-10 rounded-lg bg-light-card dark:bg-dark-card" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3 w-14 rounded bg-light-card dark:bg-dark-card" />
            <div className="h-3 w-10 rounded bg-light-card dark:bg-dark-card" />
          </div>
        </div>
      ))}
    </div>

    {[...Array(4)].map((_, index) => (
      <div
        key={index}
        className="rounded-2xl border border-light-border/70 dark:border-dark-border/70 p-4 space-y-3"
      >
        <div className="h-3 w-28 rounded bg-light-card dark:bg-dark-card" />
        {[...Array(4)].map((__, rowIndex) => (
          <div key={rowIndex} className="flex items-center justify-between gap-4">
            <div className="h-4 w-28 rounded bg-light-card dark:bg-dark-card" />
            <div className="h-4 w-20 rounded bg-light-card dark:bg-dark-card" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

export default AdminSalaryManagement;
