import Leave from '../models/leaveSchema.js';
import LeaveAccrualRun from '../models/leaveAccrualRunSchema.js';
import LeaveBalance from '../models/leaveBalanceSchema.js';
import LeaveEncashment from '../models/leaveEncashmentSchema.js';
import LeaveType from '../models/leaveTypeSchema.js';
import LeaveYearEndRun from '../models/leaveYearEndRunSchema.js';
import Employee from '../models/employeeSchema.js';
import PredefinedHoliday from '../models/predefinedHolidaySchema.js';

const toIsoDate = (date) => new Date(date).toISOString().split('T')[0];

const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

const isSunday = (date) => date.getUTCDay() === 0;

export const ensureDefaultLeaveTypes = async () => {
  const defaults = [
    {
      code: 'ANNUAL',
      name: 'Annual Leave',
      paid: true,
      accrualEnabled: true,
      monthlyAccrual: 1.5,
      maxBalance: 30,
      carryForwardLimit: 10,
      encashmentEnabled: true,
      sandwichRuleEnabled: true,
      requiresDocumentAfterDays: 3,
      isActive: true,
    },
    {
      code: 'SICK',
      name: 'Sick Leave',
      paid: true,
      accrualEnabled: true,
      monthlyAccrual: 1,
      maxBalance: 12,
      carryForwardLimit: 6,
      encashmentEnabled: false,
      sandwichRuleEnabled: false,
      requiresDocumentAfterDays: 2,
      isActive: true,
    },
    {
      code: 'UNPAID',
      name: 'Unpaid Leave',
      paid: false,
      accrualEnabled: false,
      monthlyAccrual: 0,
      maxBalance: 999,
      carryForwardLimit: 0,
      encashmentEnabled: false,
      sandwichRuleEnabled: true,
      requiresDocumentAfterDays: 0,
      isActive: true,
    },
  ];

  const operations = defaults.map((entry) => ({
    updateOne: {
      filter: { code: entry.code },
      update: { $set: entry },
      upsert: true,
    },
  }));

  if (operations.length) {
    await LeaveType.bulkWrite(operations);
  }
};

const getLocationHolidaySet = async (location, startDate, endDate) => {
  const filters = {
    date: { $gte: startDate, $lte: endDate },
    location: { $in: ['GLOBAL', location || 'GLOBAL'] },
  };

  const holidays = await PredefinedHoliday.find(filters).select('date').lean();
  return new Set(holidays.map((holiday) => toIsoDate(holiday.date)));
};

export const calculateLeaveDays = async ({ startDate, endDate, leaveTypeCode, location }) => {
  const leaveType = await LeaveType.findOne({ code: leaveTypeCode, isActive: true }).lean();
  if (!leaveType) {
    return { error: 'Invalid leave type' };
  }

  const dates = generateDateRange(startDate, endDate);
  const holidaySet = await getLocationHolidaySet(location, startDate, endDate);

  const workingDates = dates.filter((date) => {
    const key = toIsoDate(date);
    return !isSunday(date) && !holidaySet.has(key);
  });

  let sandwichDays = 0;
  if (leaveType.sandwichRuleEnabled && workingDates.length > 1) {
    const first = workingDates[0];
    const last = workingDates[workingDates.length - 1];
    const allDatesBetween = generateDateRange(first, last);
    sandwichDays = allDatesBetween.filter((date) => {
      const key = toIsoDate(date);
      const isWeekendOrHoliday = isSunday(date) || holidaySet.has(key);
      const isWithinRequested = dates.some((d) => toIsoDate(d) === key);
      return isWeekendOrHoliday && isWithinRequested;
    }).length;
  }

  return {
    leaveType,
    numberOfDays: workingDates.length + sandwichDays,
    sandwichDays,
    holidayCount: dates.length - workingDates.length,
  };
};

export const detectOverlapConflict = async ({ employeeId, startDate, endDate }) => {
  const conflict = await Leave.findOne({
    employee: employeeId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: new Date(endDate) },
    endDate: { $gte: new Date(startDate) },
  }).lean();

  if (!conflict) {
    return { hasConflict: false, message: '' };
  }

  return {
    hasConflict: true,
    message: `Overlaps with existing leave ${toIsoDate(conflict.startDate)} to ${toIsoDate(conflict.endDate)}`,
  };
};

const computeAvailable = (balance) => {
  const available =
    Number(balance.openingBalance || 0) +
    Number(balance.accrued || 0) +
    Number(balance.adjustments || 0) -
    Number(balance.used || 0) -
    Number(balance.encashed || 0) -
    Number(balance.lapsed || 0);
  return Number(available.toFixed(2));
};

export const getOrCreateLeaveBalance = async ({ employeeId, leaveTypeCode, year }) => {
  const targetYear = Number(year) || new Date().getUTCFullYear();
  let balance = await LeaveBalance.findOne({ employee: employeeId, leaveTypeCode, year: targetYear });
  if (!balance) {
    balance = await LeaveBalance.create({
      employee: employeeId,
      leaveTypeCode,
      year: targetYear,
      openingBalance: 0,
      accrued: 0,
      used: 0,
      encashed: 0,
      lapsed: 0,
      adjustments: 0,
      available: 0,
    });
  }
  balance.available = computeAvailable(balance);
  await balance.save();
  return balance;
};

export const consumeLeaveBalance = async ({ employeeId, leaveTypeCode, year, numberOfDays }) => {
  const leaveType = await LeaveType.findOne({ code: leaveTypeCode, isActive: true });
  if (!leaveType) {
    return { success: false, message: 'Leave type not found' };
  }

  if (!leaveType.paid) {
    return { success: true, skipped: true, message: 'Unpaid leave does not consume paid balance' };
  }

  const balance = await getOrCreateLeaveBalance({ employeeId, leaveTypeCode, year });
  if (Number(balance.available) < Number(numberOfDays)) {
    return {
      success: false,
      message: `Insufficient leave balance. Available ${balance.available}, requested ${numberOfDays}`,
      balance,
    };
  }

  balance.used = Number(balance.used || 0) + Number(numberOfDays);
  balance.available = computeAvailable(balance);
  await balance.save();

  return { success: true, balance };
};

export const runLeaveAccrual = async ({ month, year, initiatedBy }) => {
  const targetMonth = Number(month) || new Date().getUTCMonth() + 1;
  const targetYear = Number(year) || new Date().getUTCFullYear();

  const run = await LeaveAccrualRun.findOneAndUpdate(
    { month: targetMonth, year: targetYear },
    {
      $setOnInsert: {
        month: targetMonth,
        year: targetYear,
        status: 'queued',
        initiatedBy: initiatedBy || null,
      },
    },
    { upsert: true, new: true }
  );

  run.status = 'running';
  run.startedAt = new Date();
  run.summary = { employeesProcessed: 0, balancesUpdated: 0, errors: [] };
  await run.save();

  try {
    const [employees, leaveTypes] = await Promise.all([
      Employee.find({}).select('_id location').lean(),
      LeaveType.find({ isActive: true, accrualEnabled: true }).lean(),
    ]);

    for (const employee of employees) {
      run.summary.employeesProcessed += 1;
      for (const leaveType of leaveTypes) {
        if (Array.isArray(leaveType.locations) && leaveType.locations.length > 0) {
          if (!leaveType.locations.includes(employee.location)) {
            continue;
          }
        }

        const balance = await getOrCreateLeaveBalance({
          employeeId: employee._id,
          leaveTypeCode: leaveType.code,
          year: targetYear,
        });

        balance.accrued = Number(balance.accrued || 0) + Number(leaveType.monthlyAccrual || 0);
        if (leaveType.maxBalance) {
          const projected = computeAvailable(balance);
          if (projected > leaveType.maxBalance) {
            const overflow = projected - leaveType.maxBalance;
            balance.lapsed = Number(balance.lapsed || 0) + overflow;
          }
        }
        balance.lastAccrualAt = new Date();
        balance.available = computeAvailable(balance);
        await balance.save();
        run.summary.balancesUpdated += 1;
      }
    }

    run.status = 'completed';
    run.completedAt = new Date();
    await run.save();
    return run;
  } catch (error) {
    run.status = 'failed';
    run.completedAt = new Date();
    run.summary.errors.push(error.message);
    await run.save();
    throw error;
  }
};

export const getEncashmentQuote = async ({ employeeId, leaveTypeCode, year, daysRequested }) => {
  const leaveType = await LeaveType.findOne({ code: leaveTypeCode, isActive: true });
  if (!leaveType) {
    return { success: false, message: 'Leave type not found' };
  }
  if (!leaveType.encashmentEnabled) {
    return { success: false, message: `Encashment is disabled for leave type ${leaveTypeCode}` };
  }

  const balance = await getOrCreateLeaveBalance({ employeeId, leaveTypeCode, year });
  const requested = Number(daysRequested || 0);
  if (requested <= 0) {
    return { success: false, message: 'Requested encashment days must be greater than zero' };
  }
  if (requested > Number(balance.available || 0)) {
    return {
      success: false,
      message: `Insufficient balance for encashment. Available ${balance.available}, requested ${requested}`,
      balance,
    };
  }

  const employee = await Employee.findById(employeeId).select('salary');
  const amountPerDay = Number(employee?.salary || 0) > 0 ? Number(employee.salary) / 30 : 0;
  const amountTotal = Number((amountPerDay * requested).toFixed(2));

  return {
    success: true,
    leaveType,
    balance,
    amountPerDay: Number(amountPerDay.toFixed(2)),
    amountTotal,
    daysRequested: requested,
  };
};

export const previewLeaveRequest = async ({ employeeId, startDate, endDate, leaveTypeCode }) => {
  const employee = await Employee.findById(employeeId).select('location');
  if (!employee) {
    return { success: false, status: 404, message: 'Employee not found' };
  }

  const overlap = await detectOverlapConflict({ employeeId, startDate, endDate });
  const calculation = await calculateLeaveDays({
    startDate,
    endDate,
    leaveTypeCode,
    location: employee.location || 'GLOBAL',
  });

  if (calculation.error) {
    return { success: false, status: 400, message: calculation.error };
  }

  const year = new Date(startDate).getUTCFullYear();
  let balance = null;
  let balanceCheck = { sufficient: true, available: null, requested: Number(calculation.numberOfDays || 0) };

  if (calculation.leaveType?.paid) {
    balance = await getOrCreateLeaveBalance({
      employeeId,
      leaveTypeCode,
      year,
    });
    const available = Number(balance.available || 0);
    const requested = Number(calculation.numberOfDays || 0);
    balanceCheck = {
      sufficient: available >= requested,
      available,
      requested,
    };
  }

  return {
    success: true,
    preview: {
      leaveTypeCode,
      startDate,
      endDate,
      numberOfDays: Number(calculation.numberOfDays || 0),
      sandwichDays: Number(calculation.sandwichDays || 0),
      holidayCount: Number(calculation.holidayCount || 0),
      overlapConflict: overlap.hasConflict,
      overlapMessage: overlap.message,
      requiresDocument: Number(calculation.numberOfDays || 0) > Number(calculation.leaveType?.requiresDocumentAfterDays || 0),
      requiresDocumentAfterDays: Number(calculation.leaveType?.requiresDocumentAfterDays || 0),
      leaveType: {
        code: calculation.leaveType.code,
        name: calculation.leaveType.name,
        paid: Boolean(calculation.leaveType.paid),
        sandwichRuleEnabled: Boolean(calculation.leaveType.sandwichRuleEnabled),
      },
      balance: balance
        ? {
            year,
            available: Number(balance.available || 0),
            used: Number(balance.used || 0),
            accrued: Number(balance.accrued || 0),
            encashed: Number(balance.encashed || 0),
          }
        : null,
      balanceCheck,
    },
  };
};

export const createEncashmentRequest = async ({ employeeId, leaveTypeCode, year, daysRequested, note }) => {
  const quote = await getEncashmentQuote({ employeeId, leaveTypeCode, year, daysRequested });
  if (!quote.success) return quote;

  const request = await LeaveEncashment.create({
    employee: employeeId,
    leaveTypeCode,
    year: Number(year),
    daysRequested: quote.daysRequested,
    daysApproved: 0,
    amountPerDay: quote.amountPerDay,
    amountTotal: quote.amountTotal,
    status: 'pending',
    note: note || '',
  });

  return { success: true, request, quote };
};

export const applyEncashmentDecision = async ({ requestId, decision, decidedBy, approvedDays, note = '' }) => {
  const request = await LeaveEncashment.findById(requestId);
  if (!request) {
    return { success: false, status: 404, message: 'Encashment request not found' };
  }
  if (!['pending', 'approved'].includes(request.status)) {
    return {
      success: false,
      status: 400,
      message: `Encashment request cannot be changed from ${request.status}`,
    };
  }

  if (decision === 'rejected') {
    request.status = 'rejected';
    request.decidedBy = decidedBy || null;
    request.decidedAt = new Date();
    request.note = note || request.note;
    await request.save();
    return { success: true, request };
  }

  const daysToApprove = Number(approvedDays || request.daysRequested);
  const quote = await getEncashmentQuote({
    employeeId: request.employee,
    leaveTypeCode: request.leaveTypeCode,
    year: request.year,
    daysRequested: daysToApprove,
  });
  if (!quote.success) {
    return { success: false, status: 409, message: quote.message };
  }

  if (decision === 'approved') {
    request.status = 'approved';
    request.daysApproved = daysToApprove;
    request.amountPerDay = quote.amountPerDay;
    request.amountTotal = quote.amountTotal;
    request.decidedBy = decidedBy || null;
    request.decidedAt = new Date();
    request.note = note || request.note;
    await request.save();
    return { success: true, request };
  }

  if (decision === 'paid') {
    const balance = await getOrCreateLeaveBalance({
      employeeId: request.employee,
      leaveTypeCode: request.leaveTypeCode,
      year: request.year,
    });

    const consumeDays = Number(request.daysApproved || request.daysRequested || 0);
    if (Number(balance.available || 0) < consumeDays) {
      return {
        success: false,
        status: 409,
        message: `Insufficient leave balance to mark paid. Available ${balance.available}, required ${consumeDays}`,
      };
    }

    balance.encashed = Number(balance.encashed || 0) + consumeDays;
    balance.available = computeAvailable(balance);
    await balance.save();

    request.status = 'paid';
    request.paidAt = new Date();
    request.decidedBy = decidedBy || null;
    request.decidedAt = new Date();
    request.note = note || request.note;
    await request.save();
    return { success: true, request, balance };
  }

  return { success: false, status: 400, message: `Unsupported decision ${decision}` };
};

export const runYearEndCarryForward = async ({ sourceYear, initiatedBy }) => {
  const fromYear = Number(sourceYear) || new Date().getUTCFullYear() - 1;
  const toYear = fromYear + 1;

  const run = await LeaveYearEndRun.findOneAndUpdate(
    { sourceYear: fromYear, targetYear: toYear },
    {
      $setOnInsert: {
        sourceYear: fromYear,
        targetYear: toYear,
        initiatedBy: initiatedBy || null,
        status: 'queued',
      },
    },
    { upsert: true, new: true }
  );

  run.status = 'running';
  run.startedAt = new Date();
  run.summary = { balancesProcessed: 0, carriedForwardDays: 0, lapsedDays: 0, errors: [] };
  await run.save();

  try {
    const [balances, leaveTypes] = await Promise.all([
      LeaveBalance.find({ year: fromYear }),
      LeaveType.find({ isActive: true }).lean(),
    ]);

    const typeMap = new Map(leaveTypes.map((type) => [type.code, type]));

    for (const balance of balances) {
      run.summary.balancesProcessed += 1;
      const type = typeMap.get(balance.leaveTypeCode);
      if (!type) continue;

      const available = Number(balance.available || 0);
      if (available <= 0) continue;

      const carryLimit = Number(type.carryForwardLimit || 0);
      const carried = Math.max(0, Math.min(available, carryLimit));
      const lapsed = Math.max(0, available - carried);

      if (carried > 0) {
        const nextBalance = await getOrCreateLeaveBalance({
          employeeId: balance.employee,
          leaveTypeCode: balance.leaveTypeCode,
          year: toYear,
        });

        nextBalance.openingBalance = Number(nextBalance.openingBalance || 0) + carried;
        nextBalance.available = computeAvailable(nextBalance);
        await nextBalance.save();
      }

      if (lapsed > 0) {
        balance.lapsed = Number(balance.lapsed || 0) + lapsed;
      }

      if (carried > 0 || lapsed > 0) {
        balance.adjustments = Number(balance.adjustments || 0) - carried;
        balance.available = computeAvailable(balance);
        await balance.save();
      }

      run.summary.carriedForwardDays += carried;
      run.summary.lapsedDays += lapsed;
    }

    run.status = 'completed';
    run.completedAt = new Date();
    await run.save();
    return run;
  } catch (error) {
    run.status = 'failed';
    run.completedAt = new Date();
    run.summary.errors.push(error.message);
    await run.save();
    throw error;
  }
};
