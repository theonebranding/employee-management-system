import mongoose from 'mongoose';

import HolidayCredit from '../models/holidayCreditSchema.js';
import TemplateAssignment from '../models/templateAssignmentSchema.js';
import Employee from '../models/employeeSchema.js';
import {
  getEndOfIstDay,
  getIstDayKey,
  getIstDayOfWeek,
  getIstMonthRange,
  getStartOfIstDay,
  toIstDate,
} from '../utils/timezoneUtils.js';

/**
 * Build a structured error compatible with the project's error-handling
 * convention used throughout the holiday-template-restructuring spec:
 * plain Error objects carrying `status`, `code`, and `message`.
 */
const makeError = (status, code, message) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};

/**
 * Single source of truth for "what holiday dates apply to this employee in
 * this payroll month?". `payrollController.computePayroll`,
 * `leaveTemplateUtils.buildPayrollDaySets`, and
 * `attendanceSummaryController` all consume this function so they share a
 * single, consistent view of the data.
 *
 * Returns Map and Set instances (not plain objects) so callers can iterate
 * for persistence (`holidayBreakdown.fixedDates` / `floatingDates`) and use
 * `.size` / `.has(key)` for the working-days math.
 *
 * Sundays are filtered from BOTH per-source maps and the resulting union -
 * Sundays already do not contribute to working days, so subtracting them a
 * second time would over-deduct (Requirement 7.3).
 *
 * Validates: Requirements 3.1, 3.2, 3.4, 4.1, 7.1, 7.2, 7.3
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.employeeId
 * @param {number} params.month - 1-indexed (1=Jan ... 12=Dec)
 * @param {number} params.year
 * @returns {Promise<{
 *   fixedDates: Map<string, { name: string, date: Date }>,
 *   floatingDates: Map<string, { creditId: mongoose.Types.ObjectId, date: Date }>,
 *   all: Set<string>
 * }>}
 */
const getEmployeeHolidayDateSet = async ({ employeeId, month, year }) => {
  const { start, end } = getIstMonthRange(month, year);

  // ---- fixed-template holidays ----------------------------------------
  // Pull every assignment for this employee and walk the populated
  // template's `holidays[]` array. Only `type === 'fixed'` templates
  // contribute - floating templates feed `floatingDates` via
  // HolidayCredit instead.
  const fixedDates = new Map();
  const assignments = await TemplateAssignment.find({ employee: employeeId })
    .populate('template')
    .lean();

  for (const assignment of assignments) {
    const template = assignment.template;
    if (!template || template.type !== 'fixed') continue;
    const holidays = Array.isArray(template.holidays) ? template.holidays : [];
    for (const holiday of holidays) {
      const holidayDate = holiday.date instanceof Date ? holiday.date : new Date(holiday.date);
      if (Number.isNaN(holidayDate.getTime())) continue;
      if (holidayDate < start || holidayDate > end) continue;
      const dateKey = getIstDayKey(holidayDate);
      // last write wins on duplicates - matches the spec.
      fixedDates.set(dateKey, { name: holiday.name, date: holidayDate });
    }
  }

  // ---- floating-credit holidays ---------------------------------------
  // Only `redeemed` credits with `redeemedOn` inside the IST month range
  // contribute to working-days reduction (Requirement 4.1).
  const floatingDates = new Map();
  const credits = await HolidayCredit.find({
    employee: employeeId,
    status: 'redeemed',
    redeemedOn: { $gte: start, $lte: end },
  }).lean();

  for (const credit of credits) {
    if (!credit.redeemedOn) continue;
    const redeemedDate =
      credit.redeemedOn instanceof Date ? credit.redeemedOn : new Date(credit.redeemedOn);
    if (Number.isNaN(redeemedDate.getTime())) continue;
    const dateKey = getIstDayKey(redeemedDate);
    floatingDates.set(dateKey, { creditId: credit._id, date: redeemedDate });
  }

  // ---- strip Sundays from both maps -----------------------------------
  // Sundays are non-working days already; counting a holiday on Sunday
  // would double-deduct (Requirement 3.2 / 7.3). We mutate the maps in
  // place so callers persisting `holidayBreakdown.fixedDates` /
  // `floatingDates` only see the kept (non-Sunday) entries.
  for (const [dateKey, value] of fixedDates) {
    if (getIstDayOfWeek(value.date) === 0) fixedDates.delete(dateKey);
  }
  for (const [dateKey, value] of floatingDates) {
    if (getIstDayOfWeek(value.date) === 0) floatingDates.delete(dateKey);
  }

  // ---- union by dateKey ------------------------------------------------
  // A date present in both fixed and floating still counts once
  // (Requirement 7.2). The union is by key, not by source.
  const all = new Set();
  for (const dateKey of fixedDates.keys()) all.add(dateKey);
  for (const dateKey of floatingDates.keys()) all.add(dateKey);

  return { fixedDates, floatingDates, all };
};

/**
 * Convenience wrapper that answers "is this employee on holiday on this
 * specific date?". Used by `attendanceSummaryController` for per-day
 * absentee classification.
 *
 * Validates: Requirements 7.1, 9.1
 *
 * @param {string|mongoose.Types.ObjectId} employeeId
 * @param {Date|string|number} date
 * @returns {Promise<boolean>}
 */
const isEmployeeOnHoliday = async (employeeId, date) => {
  const ist = toIstDate(date);
  const month = ist.getUTCMonth() + 1;
  const year = ist.getUTCFullYear();
  const { all } = await getEmployeeHolidayDateSet({ employeeId, month, year });
  return all.has(getIstDayKey(date));
};

/**
 * Resolve a single IST-normalized date range from one of three input
 * shapes. Mirrors the shape that `holidayController.getEmployeeOnHoliday`
 * exposes to the existing admin UI.
 */
const resolveDateRange = ({ date, startDate, endDate, month, year }) => {
  if (date) {
    return { start: getStartOfIstDay(date), end: getEndOfIstDay(date) };
  }
  if (startDate && endDate) {
    return { start: getStartOfIstDay(startDate), end: getEndOfIstDay(endDate) };
  }
  if (month && year) {
    return getIstMonthRange(Number(month), Number(year));
  }
  throw makeError(
    400,
    'VALIDATION',
    "Invalid parameters. Provide either 'date', 'month & year', or 'startDate & endDate'."
  );
};

/**
 * List employees who have at least one holiday entry within a given date
 * range. Powers the `/holidays/employees-on-holiday` endpoint and the
 * employee-profile holiday tabs.
 *
 * Implementation runs two aggregations - one over `templateassignments`
 * joined with `holidaytemplates` (fixed dates), one over `holidaycredits`
 * joined with `holidaytemplates` (floating redemption dates) - and merges
 * results in JS, grouping by employee. This mirrors the legacy
 * `holidayController.getEmployeeOnHoliday` output shape but adds a
 * `source: 'fixed' | 'floating'` discriminator on each holiday entry.
 *
 * Sundays are filtered out of the resulting holiday entries (Requirement
 * 7.3); the date range itself is not pre-filtered for Sundays so callers
 * (like the absentee list) can still operate on raw range data.
 *
 * Validates: Requirements 9.1, 9.3
 *
 * @param {object} params
 * @param {Date|string} [params.date]
 * @param {Date|string} [params.startDate]
 * @param {Date|string} [params.endDate]
 * @param {number} [params.month]
 * @param {number} [params.year]
 * @param {string|mongoose.Types.ObjectId} [params.employeeId] - optional
 *        single-employee filter
 * @returns {Promise<Array<{
 *   employee: { _id: mongoose.Types.ObjectId, name: string, email: string, employeeCode: string },
 *   holidays: Array<{ name: string, date: Date, source: 'fixed' | 'floating' }>
 * }>>}
 */
const getEmployeesOnHoliday = async ({
  date,
  startDate,
  endDate,
  month,
  year,
  employeeId,
} = {}) => {
  const { start, end } = resolveDateRange({ date, startDate, endDate, month, year });

  const employeeFilterId = employeeId ? new mongoose.Types.ObjectId(String(employeeId)) : null;

  // ---- fixed-template holidays via TemplateAssignment ----------------
  const fixedMatchStage = employeeFilterId ? [{ $match: { employee: employeeFilterId } }] : [];

  const fixedRows = await TemplateAssignment.aggregate([
    ...fixedMatchStage,
    {
      $lookup: {
        from: 'holidaytemplates',
        localField: 'template',
        foreignField: '_id',
        as: 'templateDoc',
      },
    },
    { $unwind: '$templateDoc' },
    { $match: { 'templateDoc.type': 'fixed' } },
    { $unwind: '$templateDoc.holidays' },
    {
      $match: {
        'templateDoc.holidays.date': { $gte: start, $lte: end },
      },
    },
    {
      $project: {
        _id: 0,
        employee: 1,
        holiday: {
          name: '$templateDoc.holidays.name',
          date: '$templateDoc.holidays.date',
          source: 'fixed',
        },
      },
    },
  ]);

  // ---- redeemed floating credits ------------------------------------
  const floatingMatch = {
    status: 'redeemed',
    redeemedOn: { $gte: start, $lte: end },
  };
  if (employeeFilterId) floatingMatch.employee = employeeFilterId;

  const floatingRows = await HolidayCredit.aggregate([
    { $match: floatingMatch },
    {
      $lookup: {
        from: 'holidaytemplates',
        localField: 'template',
        foreignField: '_id',
        as: 'templateDoc',
      },
    },
    { $unwind: '$templateDoc' },
    {
      $addFields: {
        // The template's holidays[] entry whose _id matches sourceHolidayId
        // gives us the original holiday name for display. If the admin has
        // since edited the template and removed that entry, we fall back to
        // the template name so the row is still meaningful.
        sourceHolidayEntry: {
          $first: {
            $filter: {
              input: '$templateDoc.holidays',
              as: 'h',
              cond: { $eq: ['$$h._id', '$sourceHolidayId'] },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        employee: 1,
        holiday: {
          name: { $ifNull: ['$sourceHolidayEntry.name', '$templateDoc.name'] },
          date: '$redeemedOn',
          source: 'floating',
        },
      },
    },
  ]);

  // ---- merge, strip Sundays, and group by employee ------------------
  const merged = [...fixedRows, ...floatingRows].filter(
    (row) => getIstDayOfWeek(row.holiday.date) !== 0
  );

  const byEmployee = new Map();
  for (const row of merged) {
    const empKey = String(row.employee);
    if (!byEmployee.has(empKey)) byEmployee.set(empKey, []);
    byEmployee.get(empKey).push(row.holiday);
  }

  if (byEmployee.size === 0) return [];

  const employees = await Employee.find({
    _id: { $in: [...byEmployee.keys()] },
  })
    .select('_id name email employeeCode')
    .lean();

  return employees.map((emp) => ({
    employee: {
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      employeeCode: emp.employeeCode,
    },
    holidays: byEmployee.get(String(emp._id)) || [],
  }));
};

export { getEmployeeHolidayDateSet, isEmployeeOnHoliday, getEmployeesOnHoliday };
