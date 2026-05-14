import mongoose from 'mongoose';
import Payroll from '../models/payrollSchema.js';
import PayrollHistory from '../models/payrollHistorySchema.js';
import Salary from '../models/salarySchema.js';
import Employee from '../models/employeeSchema.js';
import Attendance from '../models/attendanceSchema.js';
import Leave from '../models/leaveSchema.js';
import SelectedHoliday from '../models/selectedHolidaySchema.js';
import PayslipSettings from '../models/payslipSettingsSchema.js';
import PayrollSettings from '../models/payrollSettingsSchema.js';
import AdminAttendanceSettings from '../models/adminAttendanceSettingsSchema.js';
import LoanAdvance from '../models/loanAdvanceSchema.js';
import ExtraAllowance from '../models/extraAllowanceSchema.js';
import sendEmail from '../services/sendEmail.js';
import { generatePayslipHtml, getDefaultPayslipSettings } from '../utils/payslipUtils.js';
import {
  getIstDayKey,
  getIstDayOfWeek,
  getIstDayStartFromParts,
  getIstMonthRange,
  toIstDate,
} from '../utils/timezoneUtils.js';

const HOURS_PER_DAY = 8;

const resolvePayslipSettings = async () => {
  let settings = await PayslipSettings.findOne();
  if (!settings) {
    settings = new PayslipSettings(getDefaultPayslipSettings());
    await settings.save();
  }
  return settings;
};

const resolvePayrollSettings = async () => {
  let settings = await PayrollSettings.findOne();
  if (!settings) {
    settings = new PayrollSettings();
    await settings.save();
  }
  return settings;
};

const toPlainObject = (value) => (value?.toObject ? value.toObject() : value || {});

const mergePayslipSettings = (snapshot, settings) => ({
  ...toPlainObject(snapshot),
  ...toPlainObject(settings),
});

const pickTemplate = (settings) => {
  return (
    settings.templates.find((template) => template.id === settings.activeTemplateId) ||
    settings.templates[0] || {
      id: 'classic-template',
      name: 'Classic Ledger',
      accentStyle: 'classic',
    }
  );
};

const getMonthRange = (month, year) => getIstMonthRange(month, year);
const isPayrollMonthClosed = (month, year) => {
  const { end } = getIstMonthRange(month, year);
  const now = new Date();
  return now > end;
};

const resolveAttendanceStatus = (record, settings) => {
  if (!record) return 'absent';

  if (record.manualPayrollStatus === 'leave') return 'leave';
  if (record.manualPayrollStatus === 'absent') return 'absent';
  if (record.manualPayrollStatus === 'half-day') return 'half-day';
  if (record.manualPayrollStatus === 'full-day') return 'full-day';

  const workingMinutes = Number(record.totalWorkingTime || 0);
  const minAbsentHours = Number(settings?.minAbsentHours || 180);
  const halfDayHours = Number(settings?.halfDayHours || 240);
  const fullDayHours = Number(settings?.fullDayHours || 470);

  if (workingMinutes < minAbsentHours) return 'absent';
  if (workingMinutes < fullDayHours) return 'half-day';
  return 'full-day';
};

const countWorkingDays = (month, year) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = getIstDayStartFromParts(year, month, day);
    if (getIstDayOfWeek(date) !== 0) {
      workingDays += 1;
    }
  }

  return workingDays;
};

const toDateKey = (date) => getIstDayKey(date);

const toMonthIndex = (year, month) => year * 12 + (month - 1);

const getLoanAdvanceDeduction = async (employeeId, month, year) => {
  const records = await LoanAdvance.find({ employee: employeeId, status: 'active' }).lean();
  const targetIndex = toMonthIndex(year, month);
  const completedIds = [];

  const total = records.reduce((sum, record) => {
    const transactionDate = record.transactionDate ? toIstDate(record.transactionDate) : null;
    if (!transactionDate) return sum;

    const startIndex = toMonthIndex(
      transactionDate.getUTCFullYear(),
      transactionDate.getUTCMonth() + 1
    );

    if (record.type === 'advance') {
      if (targetIndex === startIndex) {
        return sum + Number(record.amount || 0);
      }
      if (targetIndex > startIndex) {
        completedIds.push(record._id);
      }
      return sum;
    }

    if (record.type !== 'loan') {
      return sum;
    }

    if (targetIndex < startIndex) return sum;

    const totalAmount = Number(record.amount || 0);
    const monthlyInstallment = Number(record.monthlyInstallment || 0);
    const installmentMonths = record.tenureMonths
      ? Number(record.tenureMonths)
      : totalAmount && monthlyInstallment
        ? Math.ceil(totalAmount / monthlyInstallment)
        : 0;
    const lastIndex = installmentMonths ? startIndex + installmentMonths - 1 : startIndex;

    if (installmentMonths && targetIndex > lastIndex) {
      completedIds.push(record._id);
      return sum;
    }

    if (record.tenureMonths && targetIndex >= startIndex + Number(record.tenureMonths)) {
      return sum;
    }

    if (record.installmentType === 'monthly') {
      if (!monthlyInstallment) return sum;
      return sum + monthlyInstallment;
    }

    if (record.installmentType === 'tenure' && record.tenureMonths) {
      return sum + Number(record.amount || 0) / Number(record.tenureMonths);
    }

    return sum;
  }, 0);

  if (completedIds.length) {
    await LoanAdvance.updateMany(
      { _id: { $in: completedIds }, status: 'active' },
      { $set: { status: 'completed' } }
    );
  }

  return total;
};

const getExtraAllowanceTotal = async (employeeId, month, year) => {
  const records = await ExtraAllowance.find({ employee: employeeId, status: 'active' }).lean();
  const targetIndex = toMonthIndex(year, month);

  return records.reduce((total, record) => {
    const transactionDate = record.transactionDate ? toIstDate(record.transactionDate) : null;
    if (!transactionDate) return total;

    const startIndex = toMonthIndex(
      transactionDate.getUTCFullYear(),
      transactionDate.getUTCMonth() + 1
    );

    if (targetIndex !== startIndex) return total;
    return total + Number(record.amount || 0);
  }, 0);
};

const getSundayCompensationFromRecord = (record) => {
  if (!record?.checkInTime) return null;
  if (record.manualPayrollStatus === 'absent' || record.manualPayrollStatus === 'leave') return null;

  const isHalfDay = record.manualPayrollStatus === 'half-day' || record.halfDay;
  const fraction = isHalfDay ? 0.5 : 1;
  const label = isHalfDay ? 'half-day' : 'full-day';
  return { fraction, label };
};

const buildSundayCompensationEntries = ({ attendanceRecords, dailyWage }) => {
  return attendanceRecords
    .filter((record) => getIstDayOfWeek(new Date(record.date)) === 0)
    .map((record) => {
      const rule = getSundayCompensationFromRecord(record);
      if (!rule) return null;

      const dateKey = toDateKey(new Date(record.date));
      const amount = Number((Number(dailyWage || 0) * rule.fraction).toFixed(2));
      return {
        dateKey,
        amount,
        statusLabel: rule.label,
        remark: `Sunday compensation (${rule.label}) for ${dateKey}`,
      };
    })
    .filter(Boolean);
};

const syncSundayCompensationExtras = async ({ employeeId, month, year, entries, processedBy }) => {
  const { start, end } = getIstMonthRange(month, year);
  const existing = await ExtraAllowance.find({
    employee: employeeId,
    status: 'active',
    reference: 'Compensation',
    transactionDate: { $gte: start, $lte: end },
  });

  const existingByDate = new Map();
  existing.forEach((item) => {
    existingByDate.set(toDateKey(new Date(item.transactionDate)), item);
  });

  const desiredDates = new Set(entries.map((entry) => entry.dateKey));

  for (const entry of entries) {
    const [yearPart, monthPart, dayPart] = entry.dateKey.split('-').map(Number);
    const transactionDate = getIstDayStartFromParts(yearPart, monthPart, dayPart);
    const current = existingByDate.get(entry.dateKey);

    if (!current) {
      await ExtraAllowance.create({
        employee: employeeId,
        amount: entry.amount,
        transactionDate,
        reference: 'Compensation',
        comment: entry.remark,
        approvedBy: processedBy || undefined,
        approvedAt: new Date(),
      });
      continue;
    }

    const needsUpdate =
      Number(current.amount || 0) !== Number(entry.amount || 0) ||
      (current.comment || '') !== entry.remark;

    if (needsUpdate) {
      current.amount = entry.amount;
      current.comment = entry.remark;
      current.reference = 'Compensation';
      current.approvedBy = processedBy || current.approvedBy;
      current.approvedAt = new Date();
      await current.save();
    }
  }

  for (const current of existing) {
    const dateKey = toDateKey(new Date(current.transactionDate));
    if (!desiredDates.has(dateKey)) {
      current.status = 'cancelled';
      await current.save();
    }
  }
};

const getComputedNetPay = (payroll, loanAmountOverride) => {
  const dailyWage = Number(payroll.dailyWage || 0);
  const fullDays = Number(payroll.fullDays || 0);
  const halfDays = Number(payroll.halfDays || 0);
  const paidLeaves = Number(payroll.paidLeaves || 0);
  const overtimeAmount = Number(payroll.overtimeAmount || 0);
  const extraAmount = Number(payroll.extraAmount || 0);
  const penalties = Number(payroll.penalties || 0);
  const loanAmount = Number(loanAmountOverride ?? (payroll.loanAmount || 0));

  return (
    fullDays * dailyWage +
    halfDays * dailyWage * 0.5 +
    paidLeaves * dailyWage +
    overtimeAmount +
    extraAmount -
    penalties -
    loanAmount
  );
};

const countApprovedLeaves = (leaves, month, year, attendanceDays, holidayDays) => {
  let total = 0;
  const { start: startOfMonth, end: endOfMonth } = getIstMonthRange(month, year);

  leaves.forEach((leave) => {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const rangeStart = start < startOfMonth ? startOfMonth : start;
    const rangeEnd = end > endOfMonth ? endOfMonth : end;

    const current = new Date(rangeStart);
    while (current <= rangeEnd) {
      const dateKey = toDateKey(current);
      if (
        getIstDayOfWeek(current) !== 0 &&
        !attendanceDays.has(dateKey) &&
        !holidayDays.has(dateKey)
      ) {
        total += 1;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
  });

  return total;
};

const computePayroll = async ({
  employee,
  month,
  year,
  overtimeHours,
  penalties,
  loanAmount,
  extraAmount,
  payrollSettings,
  processedBy,
  persistSundayCompensation = false,
}) => {
  const autoLoanAmount = await getLoanAdvanceDeduction(employee._id, month, year);
  const hasManualLoanAmount = loanAmount !== undefined && loanAmount !== null;
  const totalLoanAmount = hasManualLoanAmount
    ? Number(loanAmount || 0)
    : Number(autoLoanAmount || 0);
  const { start, end } = getMonthRange(month, year);
  const workingDays = countWorkingDays(month, year);

  const attendanceRecords = await Attendance.find({
    employee: employee._id,
    date: { $gte: start, $lte: end },
  });

  const adminAttendanceSettings = await AdminAttendanceSettings.findOne().lean();
  const requiredWorkingMinutes = Number(
    adminAttendanceSettings?.totalWorkingHours || HOURS_PER_DAY * 60
  );
  const bufferMinutesValue = String(payrollSettings?.overtime?.bufferMinutes || '00:00');
  const [bufferHours, bufferMinutes] = bufferMinutesValue
    .split(':')
    .map((value) => Number(value || 0));
  const totalBufferMinutes = Math.max(0, bufferHours * 60 + bufferMinutes);
  const isOvertimeEnabled = payrollSettings?.overtime?.enabled !== false;

  const salaryRecord = await Salary.findOne({ employee: employee._id })
    .sort({ createdAt: -1 })
    .lean();

  const baseSalary = Number(salaryRecord?.baseSalary || 0);
  const dailyWage = workingDays ? baseSalary / workingDays : 0;

  const sundayCompensationEntries = buildSundayCompensationEntries({
    attendanceRecords,
    dailyWage,
  });
  const sundayCompensationTotal = sundayCompensationEntries.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0
  );

  if (persistSundayCompensation) {
    await syncSundayCompensationExtras({
      employeeId: employee._id,
      month,
      year,
      entries: sundayCompensationEntries,
      processedBy,
    });
  }

  const storedExtraAmount = await getExtraAllowanceTotal(employee._id, month, year);
  const autoExtraAmount = persistSundayCompensation
    ? storedExtraAmount
    : storedExtraAmount + sundayCompensationTotal;

  let fullDays = 0;
  let halfDays = 0;
  let manualLeaveDays = 0;

  attendanceRecords.forEach((record) => {
    const isSunday = getIstDayOfWeek(new Date(record.date)) === 0;
    if (isSunday) {
      return;
    }

    const resolvedStatus = resolveAttendanceStatus(record, adminAttendanceSettings);

    if (resolvedStatus === 'leave') {
      manualLeaveDays += 1;
      return;
    }
    if (resolvedStatus === 'absent') {
      return;
    }
    if (resolvedStatus === 'half-day') {
      halfDays += 1;
      return;
    }
    fullDays += 1;
  });

  const approvedLeaves = await Leave.find({
    employee: employee._id,
    status: 'approved',
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  const attendanceDays = new Set(
    attendanceRecords
      .filter((record) => record.checkInTime)
      .map((record) => toDateKey(new Date(record.date)))
  );

  const selectedHoliday = await SelectedHoliday.findOne({ employee: employee._id });
  const holidayDays = new Set(
    selectedHoliday?.selectedHolidays?.map((holiday) => toDateKey(new Date(holiday.date))) || []
  );

  const approvedPaidLeaves = countApprovedLeaves(approvedLeaves, month, year, attendanceDays, holidayDays);
  const paidLeaves = approvedPaidLeaves + manualLeaveDays;
  const unpaidDays = Math.max(0, workingDays - fullDays - halfDays - paidLeaves);
  const dailyWageOvertimeMultiplier = Number(payrollSettings?.overtime?.dailyWageMultiplier || 1);
  const fallbackOvertimeRate = (dailyWage / HOURS_PER_DAY) * dailyWageOvertimeMultiplier;
  const configuredOvertimeRate = Number(payrollSettings?.overtime?.hourlyRate || 0);
  const overtimeRateBasis = String(payrollSettings?.overtime?.rateBasis || 'fixed');
  const overtimeRate =
    overtimeRateBasis === 'daily_wage'
      ? fallbackOvertimeRate
      : configuredOvertimeRate > 0
        ? configuredOvertimeRate
        : fallbackOvertimeRate;
  const autoOvertimeMinutes = isOvertimeEnabled
    ? attendanceRecords.reduce((total, record) => {
        if (getIstDayOfWeek(new Date(record.date)) === 0) {
          return total;
        }

        let workingMinutes = Number(record.totalWorkingTime || 0);
        if (workingMinutes > 24 * 60) {
          workingMinutes = Math.floor(workingMinutes / 60000);
        }
        if (!workingMinutes && record.checkInTime && record.checkOutTime) {
          const durationMs =
            new Date(record.checkOutTime) -
            new Date(record.checkInTime) -
            Number(record.totalRecessDuration || 0);
          workingMinutes = Math.max(0, Math.floor(durationMs / 60000));
        }
        const overtimeMinutes = Math.max(
          0,
          workingMinutes - requiredWorkingMinutes - totalBufferMinutes
        );
        return total + overtimeMinutes;
      }, 0)
    : 0;
  const resolvedOvertimeHours =
    overtimeHours !== undefined && overtimeHours !== null
      ? Number(overtimeHours || 0)
      : Math.round((autoOvertimeMinutes / 60) * 100) / 100;
  const overtimeAmount = resolvedOvertimeHours * overtimeRate;
  const halfDayDeduction = halfDays * dailyWage * 0.5;
  const defaultExtra = Number(payrollSettings?.extras?.defaultExtra || 0);
  const normalizedExtraAmount =
    extraAmount !== undefined && extraAmount !== null
      ? Number(extraAmount || 0)
      : defaultExtra;
  const totalExtraAmount = normalizedExtraAmount + Number(autoExtraAmount || 0);

  const totalSalary =
    fullDays * dailyWage +
    halfDays * dailyWage * 0.5 +
    paidLeaves * dailyWage +
    overtimeAmount +
    totalExtraAmount -
    Number(penalties || 0) -
    totalLoanAmount;

  return {
    workingDays,
    fullDays,
    halfDays,
    paidLeaves,
    unpaidDays,
    baseSalary,
    dailyWage,
    overtimeHours: resolvedOvertimeHours,
    overtimeAmount,
    extraAmount: totalExtraAmount,
    halfDayDeduction,
    totalSalary,
    loanAmount: totalLoanAmount,
    sundayCompensation: {
      count: sundayCompensationEntries.length,
      total: Number(sundayCompensationTotal.toFixed(2)),
      dates: sundayCompensationEntries.map((entry) => ({
        date: entry.dateKey,
        amount: entry.amount,
        status: entry.statusLabel,
      })),
    },
  };
};

const upsertPayroll = async ({
  employee,
  month,
  year,
  overtimeHours,
  penalties = 0,
  loanAmount,
  extraAmount = 0,
  status = 'unpaid',
  processedBy,
}) => {
  const payrollSettings = await resolvePayrollSettings();
  const payrollValues = await computePayroll({
    employee,
    month,
    year,
    overtimeHours,
    penalties,
    loanAmount,
    extraAmount,
    payrollSettings,
    processedBy,
    persistSundayCompensation: true,
  });

  const salaryDeductions =
    Number(penalties || 0) +
    Number(payrollValues.loanAmount || 0) +
    payrollValues.unpaidDays * payrollValues.dailyWage +
    payrollValues.halfDayDeduction;
  const salaryBonuses = Number(payrollValues.extraAmount || 0) + payrollValues.overtimeAmount;

  const settings = await resolvePayslipSettings();
  const template = pickTemplate(settings);

  let salary = await Salary.findOne({
    employee: employee._id,
    salaryMonth: month,
    salaryYear: year,
  }).sort({ createdAt: -1 });

  if (!salary) {
    salary = new Salary({
      employee: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      baseSalary: payrollValues.baseSalary,
      bonuses: salaryBonuses,
      deductions: salaryDeductions,
      totalSalary: payrollValues.totalSalary,
      salaryMonth: month,
      salaryYear: year,
      templateId: template.id,
      templateName: template.name,
      payslipStatus: 'draft',
      payslipSnapshot: {
        companyName: settings.companyName,
        companyAddress: settings.companyAddress,
        companyEmail: settings.companyEmail,
        companyPhone: settings.companyPhone,
        logoData: settings.logoData,
        signatureData: settings.signatureData,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        footerNote: settings.footerNote,
      },
    });
  } else {
    salary.baseSalary = payrollValues.baseSalary;
    salary.bonuses = salaryBonuses;
    salary.deductions = salaryDeductions;
    salary.totalSalary = payrollValues.totalSalary;
    salary.salaryMonth = month;
    salary.salaryYear = year;
    salary.payslipSnapshot = {
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      companyEmail: settings.companyEmail,
      companyPhone: settings.companyPhone,
      logoData: settings.logoData,
      signatureData: settings.signatureData,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      footerNote: settings.footerNote,
    };
  }

  await salary.save();

  const payroll = await Payroll.findOneAndUpdate(
    { employee: employee._id, month, year },
    {
      employee: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      month,
      year,
      fullDays: payrollValues.fullDays,
      halfDays: payrollValues.halfDays,
      paidLeaves: payrollValues.paidLeaves,
      unpaidDays: payrollValues.unpaidDays,
      overtimeHours: Number(payrollValues.overtimeHours || 0),
      overtimeAmount: payrollValues.overtimeAmount,
      penalties: Number(penalties || 0),
      loanAmount: Number(payrollValues.loanAmount || 0),
      extraAmount: Number(payrollValues.extraAmount || 0),
      baseSalary: payrollValues.baseSalary,
      dailyWage: payrollValues.dailyWage,
      totalSalary: payrollValues.totalSalary,
      status,
      salaryRecord: salary._id,
      processedAt: new Date(),
      processedBy,
    },
    { new: true, upsert: true }
  );

  const sundayCompensationCount = Number(payrollValues?.sundayCompensation?.count || 0);
  const sundayCompensationTotal = Number(payrollValues?.sundayCompensation?.total || 0);
  const historyNote =
    sundayCompensationCount > 0
      ? `Payroll processed. Sunday compensation added: ${sundayCompensationCount} entries (₹${sundayCompensationTotal.toFixed(2)}).`
      : 'Payroll processed';

  await PayrollHistory.create({
    payroll: payroll._id,
    processedDate: new Date(),
    paymentStatus: status,
    processedBy,
    notes: historyNote,
    changes: {
      sundayCompensation: payrollValues?.sundayCompensation || {
        count: 0,
        total: 0,
        dates: [],
      },
    },
  });

  return payroll;
};

export const recomputePayrollForAttendanceChange = async ({
  employeeId,
  month,
  year,
  processedBy,
}) => {
  const existingPayroll = await Payroll.findOne({
    employee: employeeId,
    month: Number(month),
    year: Number(year),
  });

  if (!existingPayroll || existingPayroll.status === 'paid') {
    return null;
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return null;
  }

  return upsertPayroll({
    employee,
    month: Number(month),
    year: Number(year),
    overtimeHours: existingPayroll.overtimeHours,
    penalties: existingPayroll.penalties ?? 0,
    loanAmount: existingPayroll.loanAmount,
    extraAmount: existingPayroll.extraAmount,
    status: existingPayroll.status || 'unpaid',
    processedBy,
  });
};

const emailPaidPayrollPayslip = async ({ payroll, employee, processedBy }) => {
  if (payroll?.status !== 'paid' || !payroll?.salaryRecord) return;

  const salary = await Salary.findById(payroll.salaryRecord);
  if (!salary) return;

  const settings = await resolvePayslipSettings();
  const template = {
    id: salary.templateId,
    name: salary.templateName,
    accentStyle: 'classic',
  };

  const mergedSettings = mergePayslipSettings(salary.payslipSnapshot, settings);
  const payslipHtml = generatePayslipHtml({
    salary,
    employee,
    settings: mergedSettings,
    template,
  });

  await sendEmail(employee.email, `Payslip - ${salary.salaryMonth}/${salary.salaryYear}`, payslipHtml);

  salary.payslipStatus = 'generated';
  salary.generatedAt = new Date();
  salary.generatedBy = processedBy;
  salary.emailedAt = new Date();
  await salary.save();
};

export const processPayrollForEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    if (!isPayrollMonthClosed(month, year)) {
      return res.status(400).json({
        message: 'Payroll can only be processed after the selected month has ended',
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const existingPayroll = await Payroll.findOne({
      employee: employee._id,
      month,
      year,
    });

    if (existingPayroll?.status === 'paid') {
      return res.status(409).json({
        message: 'Payroll is locked because status is paid for the selected month',
      });
    }

    const payroll = await upsertPayroll({
      employee,
      month,
      year,
      overtimeHours: req.body.overtimeHours,
      penalties: req.body.penalties ?? 0,
      loanAmount: req.body.loanAmount,
      extraAmount: req.body.extraAmount,
      status: req.body.status || 'unpaid',
      processedBy: req.user?._id,
    });

    if (payroll?.status === 'paid') {
      await emailPaidPayrollPayslip({
        payroll,
        employee,
        processedBy: req.user?._id,
      });
    }

    return res.status(200).json({ message: 'Payroll processed successfully', payroll });
  } catch (error) {
    return res.status(500).json({ message: 'Error processing payroll', error: error.message });
  }
};

export const processPayrollForAll = async (req, res) => {
  try {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    const status = req.body.status || 'unpaid';

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    if (!isPayrollMonthClosed(month, year)) {
      return res.status(400).json({
        message: 'Payroll can only be processed after the selected month has ended',
      });
    }

    const employees = await Employee.find();

    const payrolls = [];
    const skipped = [];
    for (const employee of employees) {
      const existingPayroll = await Payroll.findOne({
        employee: employee._id,
        month: Number(month),
        year: Number(year),
      });

      if (existingPayroll) {
        skipped.push({ employee: employee._id, payrollId: existingPayroll._id });
        continue;
      }

      const payroll = await upsertPayroll({
        employee,
        month,
        year,
        status,
        processedBy: req.user?._id,
      });

      if (payroll?.status === 'paid') {
        await emailPaidPayrollPayslip({
          payroll,
          employee,
          processedBy: req.user?._id,
        });
      }
      payrolls.push(payroll);
    }

    return res.status(200).json({
      message: 'Payroll processed for all employees',
      payrolls,
      skipped,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error processing payroll', error: error.message });
  }
};

export const getPayrolls = async (req, res) => {
  try {
    const { month, year, status, page, limit } = req.query;
    const query = {};
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [payrolls, total] = await Promise.all([
      Payroll.find(query)
        .populate('employee', 'name email jobRole')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payroll.countDocuments(query),
    ]);


    return res.status(200).json({
      message: 'Payrolls fetched successfully',
      payrolls,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPayrolls: total,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching payrolls', error: error.message });
  }
};

export const getPayrollPreview = async (req, res) => {
  try {
    const { month, year } = req.query;
    const employees = await Employee.find();
    const payrollSettings = await resolvePayrollSettings();

    const previewPayrolls = await Promise.all(
      employees.map(async (employee) => {
        const payrollValues = await computePayroll({
          employee,
          month: Number(month),
          year: Number(year),
          overtimeHours: undefined,
          penalties: 0,
          loanAmount: undefined,
          extraAmount: undefined,
          payrollSettings,
        });

        return {
          employee: employee._id,
          employeeName: employee.name,
          employeeEmail: employee.email,
          month: Number(month),
          year: Number(year),
          fullDays: payrollValues.fullDays,
          halfDays: payrollValues.halfDays,
          paidLeaves: payrollValues.paidLeaves,
          unpaidDays: payrollValues.unpaidDays,
          overtimeHours: payrollValues.overtimeHours,
          overtimeAmount: payrollValues.overtimeAmount,
          penalties: 0,
          loanAmount: payrollValues.loanAmount,
          extraAmount: payrollValues.extraAmount,
          baseSalary: payrollValues.baseSalary,
          dailyWage: payrollValues.dailyWage,
          totalSalary: payrollValues.totalSalary,
          status: 'unpaid',
          computedLoanAmount: payrollValues.loanAmount,
          computedNetPay: payrollValues.totalSalary,
          isPreview: true,
        };
      })
    );

    return res.status(200).json({
      message: 'Payroll preview fetched successfully',
      payrolls: previewPayrolls,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching payroll preview', error: error.message });
  }
};

export const getPayrollByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    if (req.user.role === 'employee' && req.user._id !== employeeId) {
      return res.status(403).json({ message: 'You can only access your own payroll records' });
    }

    const query = { employee: employeeId };
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const payrolls = await Payroll.find(query)
      .populate('employee', 'name email jobRole')
      .sort({ year: -1, month: -1, createdAt: -1 });

    return res
      .status(200)
      .json({ message: 'Payroll records fetched successfully', payrolls });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching payroll records', error: error.message });
  }
};

export const getPayrollHistory = async (req, res) => {
  try {
    const { payrollId, employeeId } = req.query;
    const query = {};

    if (payrollId) query.payroll = payrollId;

    if (employeeId) {
      const payrolls = await Payroll.find({ employee: employeeId }).select('_id');
      query.payroll = { $in: payrolls.map((payroll) => payroll._id) };
    }

    const history = await PayrollHistory.find(query)
      .populate('payroll', 'employeeName month year totalSalary status')
      .sort({ processedDate: -1, createdAt: -1 });

    return res.status(200).json({ message: 'Payroll history fetched successfully', history });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching payroll history', error: error.message });
  }
};

export const getPayrollPayslipHtml = async (req, res) => {
  try {
    const { payrollId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(payrollId)) {
      return res.status(400).json({ message: 'Invalid payroll ID' });
    }

    const payroll = await Payroll.findById(payrollId);
    if (!payroll || !payroll.salaryRecord) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    const salary = await Salary.findById(payroll.salaryRecord);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    const employee = await Employee.findById(payroll.employee);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const settings = await resolvePayslipSettings();
    const template = pickTemplate(settings);

    salary.payslipStatus = 'generated';
    salary.generatedAt = new Date();
    salary.generatedBy = req.user?._id;
    await salary.save();

    const payslipHtml = generatePayslipHtml({
      salary,
      employee,
      settings: mergePayslipSettings(salary.payslipSnapshot, settings),
      template,
    });

    return res.status(200).json({ message: 'Payslip generated successfully', payslipHtml });
  } catch (error) {
    return res.status(500).json({ message: 'Error generating payslip', error: error.message });
  }
};
