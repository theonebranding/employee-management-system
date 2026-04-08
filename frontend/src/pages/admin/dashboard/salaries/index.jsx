/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import {
  Calculator,
  ChevronDown,
  Download,
  Filter,
  Search,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const AdminSalaryManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [previewPayrolls, setPreviewPayrolls] = useState([]);
  const [loanAdvances, setLoanAdvances] = useState([]);
  const [extraAllowances, setExtraAllowances] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [settingsPanel, setSettingsPanel] = useState(null);
  const [overtimeSettings, setOvertimeSettings] = useState({
    hourlyRate: 100,
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
    transactionDate: new Date().toISOString().slice(0, 10),
    comment: '',
  });
  const [extraSettings, setExtraSettings] = useState({
    defaultExtra: 0,
  });
  const [extraForm, setExtraForm] = useState({
    employeeId: '',
    reference: '',
    amount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    comment: '',
  });
  const [formState, setFormState] = useState({
    overtimeHours: 0,
    penalties: 0,
    loanAmount: 0,
    extraAmount: 0,
    status: 'unpaid',
  });
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
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }),
    []
  );

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employee/all`, { headers: authHeaders });
      if (!response.ok) throw new Error('Failed to fetch employees.');
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(error.message || 'Failed to fetch employees.');
    }
  };

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

  const fetchLoanAdvances = async () => {
    try {
      const response = await fetch(`${BASE_URL}/loan-advances?status=active`, {
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
      const response = await fetch(`${BASE_URL}/extra-allowances?status=active`, {
        headers: authHeaders,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.message || 'Failed to fetch extra allowances.';
        throw new Error(message);
      }
      setExtraAllowances(data.extraAllowances || []);
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
        hourlyRate: Number(settings.overtime?.hourlyRate ?? prev.hourlyRate),
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
    fetchEmployees();
    fetchSalaries();
    fetchPayrolls();
    fetchPayslipSettings();
    fetchPayrollSettings();
    fetchLoanAdvances();
    fetchExtraAllowances();
    fetchPayrollPreview();
  }, []);

  useEffect(() => {
    if (!loanForm.employeeId && employees.length > 0) {
      setLoanForm(prev => ({ ...prev, employeeId: employees[0]._id }));
    }
    if (!extraForm.employeeId && employees.length > 0) {
      setExtraForm(prev => ({ ...prev, employeeId: employees[0]._id }));
    }
  }, [employees, loanForm.employeeId, extraForm.employeeId]);

  useEffect(() => {
    fetchPayrolls();
    fetchPayrollPreview();
  }, [month, year]);

  const toMonthIndex = (yearValue, monthValue) => yearValue * 12 + (monthValue - 1);

  const getLoanDeductionForRecord = (record, monthValue, yearValue) => {
    if (record?.status && record.status !== 'active') return 0;
    if (!record?.transactionDate) return 0;
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
    loanAdvances.forEach((record) => {
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

  const openPanel = (employee, event) => {
    if (event) event.stopPropagation();
    const payroll = mergedPayrollMap[employee._id];
    setSelectedEmployee({ ...employee, payroll });
    setFormState({
      overtimeHours: payroll?.overtimeHours || 0,
      penalties: payroll?.penalties || 0,
      loanAmount: payroll?.computedLoanAmount ?? (payroll?.loanAmount || 0),
      extraAmount: payroll?.extraAmount || 0,
      status: payroll?.status || 'unpaid',
    });
    setIsPanelOpen(true);
    fetchPanelDeductions(employee._id);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedEmployee(null);
    setPanelDeductions({ lateCheckin: 0, halfDay: 0, absent: 0 });
  };

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
          transactionDate: new Date().toISOString().slice(0, 10),
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
          transactionDate: new Date().toISOString().slice(0, 10),
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
      'Role',
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
      const penalties = Number(payroll.penalties || 0);
      const loanAmount = Number(
        payroll.isPreview
          ? payroll.computedLoanAmount ?? (loanAdvanceMap[employee._id] || 0)
          : payroll.loanAmount || 0
      );
      const extras = Number(payroll.extraAmount || 0);
      const grossWage =
        Number(payroll.dailyWage || 0) *
        (Number(payroll.fullDays || 0) + Number(payroll.halfDays || 0) * 0.5);
      const netPay = Number(
        payroll.isPreview ? payroll.computedNetPay ?? 0 : payroll.totalSalary || 0
      );

      return [
        employee.employeeCode || 'N/A',
        employee.name,
        employee.jobRole || 'N/A',
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
        const penalties = Number(payroll.penalties || 0);
        const loanAmount = Number(
          payroll.isPreview
            ? payroll.computedLoanAmount ?? (loanAdvanceMap[employee._id] || 0)
            : payroll.loanAmount || 0
        );
        const extras = Number(payroll.extraAmount || 0);
        const grossWage =
          Number(payroll.dailyWage || 0) *
          (Number(payroll.fullDays || 0) + Number(payroll.halfDays || 0) * 0.5);
        const netPay = Number(
          payroll.isPreview ? payroll.computedNetPay ?? 0 : payroll.totalSalary || 0
        );

        return `
          <tr>
            <td>${employee.employeeCode || 'N/A'}</td>
            <td>${employee.name}</td>
            <td>${employee.jobRole || 'N/A'}</td>
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
            body { font-family: Arial, sans-serif; padding: 16px; }
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
                <th>Role</th>
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

  const processPayroll = async () => {
    if (!selectedEmployee) return;
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
      setPayrolls((prev) => {
        const updated = prev.filter((item) => item._id !== data.payroll._id);
        return [data.payroll, ...updated];
      });
      setSelectedEmployee((prev) => (prev ? { ...prev, payroll: data.payroll } : prev));
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
    new Promise((resolve) => {
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

  const filteredEmployees = employees
    .filter(
      employee =>
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(employee => {
      const payrollStatus = mergedPayrollMap[employee._id]?.status || 'unpaid';
      return statusFilter === 'all' || payrollStatus === statusFilter;
    })
    .sort((a, b) => {
      if (sortOrder === 'name') return a.name.localeCompare(b.name);
      if (sortOrder === 'email') return a.email.localeCompare(b.email);
      return 0;
    });

  const headerFont = { fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' };

  const renderPanelContent = (showClose = false) => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-light-text/60 dark:text-dark-text/60">
            Payroll Snapshot
          </p>
          <h2 className="text-xl font-semibold">
            {selectedEmployee?.name || 'Select Employee'}
          </h2>
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
              value={formState.overtimeHours}
              onChange={e =>
                setFormState(prev => ({ ...prev, overtimeHours: Number(e.target.value) }))
              }
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
              Penalties
            </label>
            <input
              type="number"
              value={formState.penalties}
              onChange={e => setFormState(prev => ({ ...prev, penalties: Number(e.target.value) }))}
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
              Loan Amount
            </label>
            <input
              type="number"
              value={formState.loanAmount}
              onChange={e => setFormState(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
              Extra Amount
            </label>
            <input
              type="number"
              value={formState.extraAmount}
              onChange={e => setFormState(prev => ({ ...prev, extraAmount: Number(e.target.value) }))}
              className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60">
            Status
          </label>
          <select
            value={formState.status}
            onChange={e => setFormState(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
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
            const overtimeAmount = Number(payroll?.overtimeAmount || 0);
            const extraAmount = Number(payroll?.extraAmount || 0);
            const penalties = Number(payroll?.penalties || 0);
            const loanAmount = payroll?.isPreview
              ? Number(payroll?.computedLoanAmount || 0)
              : Number(payroll?.loanAmount || 0);
            const grossPay =
              fullDays * dailyWage +
              halfDays * dailyWage * 0.5 +
              paidLeaves * dailyWage +
              overtimeAmount +
              extraAmount;
            const deductions = penalties + loanAmount;
            const totalSalary = payroll?.isPreview
              ? Number(payroll?.computedNetPay || 0)
              : Number(payroll?.totalSalary || 0);

            return (
              <>
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
            <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-xs" />
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
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white"
        >
          <Calculator className="w-4 h-4" />
          Process Payroll
        </button>
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
                placeholder="Search employees by name or email..."
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
              <button
                className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card flex items-center gap-2"
                aria-label="Open filters"
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
          <table className="min-w-full text-sm">
            <thead className="bg-light-bg/70 dark:bg-dark-bg/70 text-xs uppercase tracking-wide text-light-text/60 dark:text-dark-text/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Emp ID</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Full Day</th>
                <th className="px-4 py-3 text-left font-semibold">Half Day</th>
                <th className="px-4 py-3 text-left font-semibold">Paid Leaves</th>
                <th className="px-4 py-3 text-left font-semibold">Unpaid Days</th>
                <th className="px-4 py-3 text-left font-semibold">Daily Wage</th>
                <th className="px-4 py-3 text-left font-semibold">Gross Wage</th>
                <th className="px-4 py-3 text-left font-semibold">Base Salary</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => setSettingsPanel('overtime')}
                    className="underline decoration-dotted"
                  >
                    Overtime
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => setSettingsPanel('penalties')}
                    className="underline decoration-dotted"
                  >
                    Penalties
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => setSettingsPanel('loans')}
                    className="underline decoration-dotted"
                  >
                    Loan & Advance
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => setSettingsPanel('extras')}
                    className="underline decoration-dotted"
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
              {filteredEmployees.map(employee => {
                const payroll = mergedPayrollMap[employee._id] || {};
                const baseSalary = Number(payroll.baseSalary || getEmployeeSalary(employee.email) || 0);
                const overtime = Number(payroll.overtimeAmount || 0);
                const penalties = Number(payroll.penalties || 0);
                const loanAmount = Number(
                  payroll.isPreview
                    ? payroll.computedLoanAmount ?? (loanAdvanceMap[employee._id] || 0)
                    : payroll.loanAmount || 0
                );
                const extras = Number(payroll.extraAmount || 0);
                const grossWage =
                  Number(payroll.dailyWage || 0) *
                  (Number(payroll.fullDays || 0) + Number(payroll.halfDays || 0) * 0.5);
                const netPay = Number(
                  payroll.isPreview ? payroll.computedNetPay ?? 0 : payroll.totalSalary || 0
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
                      {employee.jobRole || 'N/A'}
                    </td>
                    <td className="px-4 py-3">{payroll.fullDays || 0}</td>
                    <td className="px-4 py-3">{payroll.halfDays || 0}</td>
                    <td className="px-4 py-3">{payroll.paidLeaves || 0}</td>
                    <td className="px-4 py-3">{payroll.unpaidDays || 0}</td>
                    <td className="px-4 py-3">₹{Number(payroll.dailyWage || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">₹{grossWage.toFixed(2)}</td>
                    <td className="px-4 py-3">₹{baseSalary.toFixed(2)}</td>
                    <td className="px-4 py-3">₹{overtime.toFixed(2)}</td>
                    <td className="px-4 py-3">₹{penalties.toFixed(2)}</td>
                    <td className="px-4 py-3">₹{loanAmount.toFixed(2)}</td>
                    <td className="px-4 py-3">₹{extras.toFixed(2)}</td>
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
      </div>

      {isPanelOpen && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex justify-end animate-fade-in"
          onClick={closePanel}
          role="presentation"
        >
          <div
            className="h-full w-full max-w-xl bg-light-bg dark:bg-dark-bg p-6 shadow-xl overflow-y-auto animate-slide-in-right"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            {renderPanelContent(true)}
          </div>
        </div>
      )}

      {settingsPanel && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex justify-end animate-fade-in"
          onClick={() => setSettingsPanel(null)}
          role="presentation"
        >
          <div
            className="h-full w-full max-w-lg bg-light-bg dark:bg-dark-bg p-6 shadow-xl overflow-y-auto animate-slide-in-right"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
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
                        : 'Add Extra Allowance'}
                </h2>
              </div>
              <button
                onClick={() => setSettingsPanel(null)}
                aria-label="Close overtime settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {settingsPanel === 'overtime' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-light-text dark:text-dark-text">
                      Fixed Per Hour Pay
                    </label>
                    <input
                      type="number"
                      value={overtimeSettings.hourlyRate}
                      onChange={e =>
                        setOvertimeSettings(prev => ({
                          ...prev,
                          hourlyRate: Number(e.target.value),
                        }))
                      }
                      className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-light-text dark:text-dark-text">
                      Buffer Period
                    </label>
                    <input
                      type="time"
                      value={overtimeSettings.bufferMinutes}
                      onChange={e =>
                        setOvertimeSettings(prev => ({
                          ...prev,
                          bufferMinutes: e.target.value,
                        }))
                      }
                      className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                    />
                    <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-2">
                      Define when overtime begins post-shift
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
                      value={penaltySettings.allowedDays}
                      onChange={e =>
                        setPenaltySettings(prev => ({
                          ...prev,
                          allowedDays: Number(e.target.value),
                        }))
                      }
                      disabled={!penaltySettings.enabled}
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
                        value={penaltySettings.fixedPenaltyPerDay}
                        onChange={e =>
                          setPenaltySettings(prev => ({
                            ...prev,
                            fixedPenaltyPerDay: Number(e.target.value),
                          }))
                        }
                        disabled={!penaltySettings.enabled}
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
                        value={penaltySettings.dailyWageMultiplier}
                        onChange={e =>
                          setPenaltySettings(prev => ({
                            ...prev,
                            dailyWageMultiplier: Number(e.target.value),
                          }))
                        }
                        disabled={!penaltySettings.enabled}
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
                          {employee.name} {employee.employeeCode ? `(${employee.employeeCode})` : ''}
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
                      value={loanForm.amount}
                      onChange={e =>
                        setLoanForm(prev => ({ ...prev, amount: e.target.value }))
                      }
                      placeholder="Enter Amount"
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
                            value={loanForm.monthlyInstallment}
                            onChange={e =>
                              setLoanForm(prev => ({
                                ...prev,
                                monthlyInstallment: e.target.value,
                              }))
                            }
                            placeholder="Enter Amount"
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
                            value={loanForm.tenureMonths}
                            onChange={e =>
                              setLoanForm(prev => ({ ...prev, tenureMonths: e.target.value }))
                            }
                            placeholder="Enter months"
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
                      onChange={e => setExtraForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="mt-2 w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                    >
                      <option value="">Select employee</option>
                      {employees.map(employee => (
                        <option key={employee._id} value={employee._id}>
                          {employee.name} {employee.employeeCode ? `(${employee.employeeCode})` : ''}
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
                      onChange={e => setExtraForm(prev => ({ ...prev, reference: e.target.value }))}
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
                      value={extraForm.amount}
                      onChange={e => setExtraForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter Amount"
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

export default AdminSalaryManagement;
