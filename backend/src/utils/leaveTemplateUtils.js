import Leave from '../models/leaveSchema.js';
import Attendance from '../models/attendanceSchema.js';
import { getEmployeeHolidayDateSet } from '../services/holidayPayrollService.js';
import { getIstDayKey, getIstDayOfWeek, toIstDate } from './timezoneUtils.js';

export const getLeavePeriodRange = (period, referenceDate = new Date()) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (period === 'yearly') {
    return {
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }

  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
};

const getPreviousPeriodReferenceDate = (period, referenceDate = new Date()) => {
  const date = new Date(referenceDate);

  if (period === 'yearly') {
    date.setFullYear(date.getFullYear() - 1);
    return date;
  }

  date.setMonth(date.getMonth() - 1);
  return date;
};

export const getInclusiveDayCount = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return 0;
  }

  const normalizedStart = new Date(start);
  normalizedStart.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(end);
  normalizedEnd.setHours(0, 0, 0, 0);

  return Math.floor((normalizedEnd - normalizedStart) / (1000 * 60 * 60 * 24)) + 1;
};

const buildPayrollDaySets = async (employeeId, startDate, endDate) => {
  const attendanceRecords = await Attendance.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate },
  }).select('date checkInTime generatedForLeave');

  const attendanceDays = new Set(
    attendanceRecords
      .filter((record) => record.checkInTime && !record.generatedForLeave)
      .map((record) => getIstDayKey(new Date(record.date)))
  );

  // Holiday dates come from the new template/credit collections via the
  // payroll service. Although the function's only documented caller
  // (countPayrollLeaveDaysInRange) operates on a single payroll month at a
  // time, leave ranges can occasionally cross a month boundary - in that
  // case we enumerate every month covered by [startDate, endDate] and union
  // their holiday sets so the IST month boundaries are respected.
  const startIst = toIstDate(startDate);
  const endIst = toIstDate(endDate);
  const holidayDays = new Set();

  let cursorYear = startIst.getUTCFullYear();
  let cursorMonth = startIst.getUTCMonth() + 1;
  const endYear = endIst.getUTCFullYear();
  const endMonth = endIst.getUTCMonth() + 1;

  while (cursorYear < endYear || (cursorYear === endYear && cursorMonth <= endMonth)) {
    const { all } = await getEmployeeHolidayDateSet({
      employeeId,
      month: cursorMonth,
      year: cursorYear,
    });
    all.forEach((dateKey) => holidayDays.add(dateKey));

    cursorMonth += 1;
    if (cursorMonth > 12) {
      cursorMonth = 1;
      cursorYear += 1;
    }
  }

  return { attendanceDays, holidayDays };
};

export const countPayrollLeaveDaysInRange = async ({ employeeId, leaves, startDate, endDate }) => {
  if (!employeeId || !Array.isArray(leaves) || !startDate || !endDate) {
    return 0;
  }

  const { attendanceDays, holidayDays } = await buildPayrollDaySets(employeeId, startDate, endDate);
  let total = 0;

  leaves.forEach((leave) => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    const rangeStart = leaveStart < startDate ? startDate : leaveStart;
    const rangeEnd = leaveEnd > endDate ? endDate : leaveEnd;

    const current = new Date(rangeStart);
    while (current <= rangeEnd) {
      const dateKey = getIstDayKey(current);
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

export const getPayrollLeaveDaysForRange = async ({ employeeId, startDate, endDate }) => {
  return countPayrollLeaveDaysInRange({
    employeeId,
    leaves: [{ startDate, endDate }],
    startDate,
    endDate,
  });
};

export const getTemplateUsedDays = async ({ employeeId, templateId, periodStart, periodEnd }) => {
  const approvedLeaves = await Leave.find({
    employee: employeeId,
    template: templateId,
    status: 'approved',
    startDate: { $lte: periodEnd },
    endDate: { $gte: periodStart },
  }).select('startDate endDate quotaDaysUsed paidDays isTemplateBased');

  const usedDays = await Promise.all(
    approvedLeaves.map(async (leave) => {
      if (Number.isFinite(leave.quotaDaysUsed) && leave.quotaDaysUsed > 0) {
        return leave.quotaDaysUsed;
      }

      if (!leave.isTemplateBased) {
        return 0;
      }

      return getPayrollLeaveDaysForRange({
        employeeId,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
    })
  );

  return usedDays.reduce((sum, value) => sum + Number(value || 0), 0);
};

export const getTemplateBalance = async ({ employeeId, template, referenceDate = new Date() }) => {
  if (!template) {
    return {
      total: 0,
      used: 0,
      remaining: 0,
      periodStart: null,
      periodEnd: null,
      baseAllocation: 0,
      carryForwardDays: 0,
      encashmentDays: 0,
      previousPeriodRemaining: 0,
      effectiveDate: null,
    };
  }

  const allocationPeriod = template.autoAllocationPeriod || 'monthly';
  const carryForwardPeriod = template.carryForwardPeriod || allocationPeriod;
  const carryForwardCount = Number(template.carryForwardCount || 0);
  const baseAllocation = Number(template.autoAllocationCount || 0);
  const effectiveDate = new Date(template.effectiveDate || template.createdAt || referenceDate);
  if (Number.isNaN(effectiveDate.getTime())) {
    effectiveDate.setTime(new Date(referenceDate).getTime());
  }

  const reference = new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) {
    reference.setTime(Date.now());
  }

  if (reference < effectiveDate) {
    return {
      total: 0,
      used: 0,
      remaining: 0,
      periodStart: null,
      periodEnd: null,
      baseAllocation,
      carryForwardDays: 0,
      encashmentDays: 0,
      previousPeriodRemaining: 0,
      effectiveDate,
    };
  }

  const { start: rawPeriodStart, end: periodEnd } = getLeavePeriodRange(
    allocationPeriod,
    reference
  );
  const periodStart = rawPeriodStart < effectiveDate ? effectiveDate : rawPeriodStart;
  const previousReferenceDate = getPreviousPeriodReferenceDate(carryForwardPeriod, reference);
  const { start: previousPeriodStart, end: previousPeriodEnd } = getLeavePeriodRange(
    carryForwardPeriod,
    previousReferenceDate
  );
  const normalizedPreviousPeriodStart =
    previousPeriodStart < effectiveDate ? effectiveDate : previousPeriodStart;

  const used = await getTemplateUsedDays({
    employeeId,
    templateId: template._id,
    periodStart,
    periodEnd,
  });

  const previousPeriodUsed =
    normalizedPreviousPeriodStart <= previousPeriodEnd
      ? await getTemplateUsedDays({
          employeeId,
          templateId: template._id,
          periodStart: normalizedPreviousPeriodStart,
          periodEnd: previousPeriodEnd,
        })
      : 0;

  const previousPeriodRemaining = Math.max(0, baseAllocation - previousPeriodUsed);
  const carryForwardDays = Math.min(previousPeriodRemaining, carryForwardCount);
  const encashmentDays = template.encashmentAllowed
    ? Math.max(previousPeriodRemaining - carryForwardDays, 0)
    : 0;
  const total = baseAllocation + carryForwardDays;

  return {
    total,
    used,
    remaining: Math.max(0, total - used),
    periodStart,
    periodEnd,
    baseAllocation,
    carryForwardDays,
    encashmentDays,
    previousPeriodRemaining,
    effectiveDate,
  };
};
