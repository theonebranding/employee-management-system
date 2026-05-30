import HolidayCredit from '../models/holidayCreditSchema.js';
import TemplateAssignment from '../models/templateAssignmentSchema.js';
import Attendance from '../models/attendanceSchema.js';
import Leave from '../models/leaveSchema.js';
import Payroll from '../models/payrollSchema.js';
import {
  getStartOfIstDay,
  getEndOfIstDay,
  getIstDayOfWeek,
  getIstDayKey,
  toIstDate,
} from '../utils/timezoneUtils.js';

/**
 * Build a plain Error object with the conventional { status, code, message } shape
 * used elsewhere in the codebase.
 */
const makeError = (status, code, message) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};

/**
 * Compute the IST calendar year of a Date (numeric, e.g. 2025).
 */
const istYearOf = (date) => toIstDate(date).getUTCFullYear();

/**
 * Compute the IST 1-indexed month of a Date (1..12).
 */
const istMonthOf = (date) => toIstDate(date).getUTCMonth() + 1;

/**
 * Redeem an `available` HolidayCredit on a target working day.
 *
 * Validates all seven rejection rules from Requirement 4 in order:
 *   1. credit.status === 'available'
 *   2. target date is not a Sunday (IST)
 *   3. target date's IST year matches credit.year
 *   4. employee is not absent or on finalized/approved leave on that date
 *   5. target date does not collide with any fixed-template holiday assigned
 *      to the employee
 *   6. payroll for that month is not in Payroll_Lock (status === 'paid')
 *
 * Plus an ownership guard (Requirement 5.3 — no actor may redeem on behalf of
 * an employee; this service is always invoked with the calling employee's id).
 *
 * @param {{ creditId: string, employeeId: string, targetDate: Date|string }} params
 * @returns {Promise<object>} the updated HolidayCredit document
 */
export async function redeemCredit({ creditId, employeeId, targetDate }) {
  const credit = await HolidayCredit.findById(creditId);
  if (!credit) {
    throw makeError(404, 'CREDIT_NOT_FOUND', 'Holiday credit not found');
  }

  // Ownership: the credit must belong to the caller (Requirement 5.3).
  if (credit.employee.toString() !== employeeId.toString()) {
    throw makeError(403, 'CREDIT_NOT_OWNED', 'You do not own this holiday credit');
  }

  // Rule 1: status must be `available`.
  if (credit.status !== 'available') {
    throw makeError(
      409,
      'CREDIT_STATUS_INVALID',
      `Holiday credit is not available for redemption (current status: ${credit.status})`
    );
  }

  // Normalize the target date to the start of the IST day so all downstream
  // comparisons use the same anchor.
  const normalizedStart = getStartOfIstDay(targetDate);
  const normalizedEnd = getEndOfIstDay(targetDate);

  // Rule 2: target date must not be a Sunday (IST).
  if (getIstDayOfWeek(normalizedStart) === 0) {
    throw makeError(422, 'REDEEM_DATE_SUNDAY', 'Target date falls on a Sunday');
  }

  // Rule 3: target date's IST year must match credit.year.
  const targetYear = istYearOf(targetDate);
  if (targetYear !== credit.year) {
    throw makeError(
      422,
      'REDEEM_YEAR_MISMATCH',
      `Target date year (${targetYear}) does not match credit year (${credit.year})`
    );
  }

  // Rule 4: employee must not have an absent/leave attendance record or a
  // finalized approved leave covering this date.
  const attendance = await Attendance.findOne({
    employee: employeeId,
    date: { $gte: normalizedStart, $lte: normalizedEnd },
  });
  if (
    attendance &&
    (attendance.manualPayrollStatus === 'absent' || attendance.manualPayrollStatus === 'leave')
  ) {
    throw makeError(
      422,
      'REDEEM_DATE_ABSENT_OR_LEAVE',
      'Target date is already marked as absent or leave'
    );
  }

  const overlappingLeave = await Leave.findOne({
    employee: employeeId,
    status: 'approved',
    startDate: { $lte: normalizedEnd },
    endDate: { $gte: normalizedStart },
  });
  if (overlappingLeave) {
    throw makeError(422, 'REDEEM_DATE_ABSENT_OR_LEAVE', 'Target date overlaps an approved leave');
  }

  // Rule 5: target date must not collide with any fixed-template holiday
  // assigned to the employee.
  const assignments = await TemplateAssignment.find({ employee: employeeId }).populate('template');
  const targetKey = getIstDayKey(normalizedStart);
  for (const assignment of assignments) {
    const template = assignment.template;
    if (!template || template.type !== 'fixed') continue;
    const holidays = template.holidays || [];
    for (const holiday of holidays) {
      if (getIstDayKey(holiday.date) === targetKey) {
        throw makeError(
          422,
          'REDEEM_DATE_FIXED_CLASH',
          'Target date matches a fixed-template holiday already assigned to you'
        );
      }
    }
  }

  // Rule 6: payroll for that month must not be locked (status === 'paid').
  const month = istMonthOf(targetDate);
  const year = targetYear;
  const lockedPayroll = await Payroll.findOne({
    employee: employeeId,
    month,
    year,
    status: 'paid',
  });
  if (lockedPayroll) {
    throw makeError(
      409,
      'PAYROLL_LOCKED',
      `Payroll for ${month}/${year} is locked; cannot redeem credit in that month`
    );
  }

  // All checks passed: persist the redemption.
  credit.status = 'redeemed';
  credit.redeemedOn = normalizedStart;
  credit.redeemedAt = new Date();
  credit.cancelledBy = null;
  credit.cancelledAt = null;
  await credit.save();
  return credit;
}

/**
 * Cancel a previously redeemed credit, returning it to the `available` pool.
 *
 * Rules:
 *   - credit.status must be `redeemed`
 *   - employee actors must own the credit; admin actors skip the ownership check
 *   - the payroll month containing redeemedOn must not be in Payroll_Lock
 *
 * @param {{ creditId: string, actorId: string, actorRole: 'admin'|'employee' }} params
 * @returns {Promise<object>} the updated HolidayCredit document
 */
export async function cancelRedemption({ creditId, actorId, actorRole }) {
  const credit = await HolidayCredit.findById(creditId);
  if (!credit) {
    throw makeError(404, 'CREDIT_NOT_FOUND', 'Holiday credit not found');
  }

  if (credit.status !== 'redeemed') {
    throw makeError(
      409,
      'CREDIT_STATUS_INVALID',
      `Holiday credit is not redeemed (current status: ${credit.status})`
    );
  }

  // Employee actors must own the credit; admin actors may cancel any credit.
  if (actorRole === 'employee') {
    if (credit.employee.toString() !== actorId.toString()) {
      throw makeError(403, 'CREDIT_NOT_OWNED', 'You do not own this holiday credit');
    }
  }

  const month = istMonthOf(credit.redeemedOn);
  const year = istYearOf(credit.redeemedOn);
  const lockedPayroll = await Payroll.findOne({
    employee: credit.employee,
    month,
    year,
    status: 'paid',
  });
  if (lockedPayroll) {
    throw makeError(
      409,
      'PAYROLL_LOCKED',
      `Payroll for ${month}/${year} is locked; cannot cancel redemption in that month`
    );
  }

  credit.status = 'available';
  credit.redeemedOn = null;
  credit.redeemedAt = null;
  credit.cancelledBy = actorId;
  credit.cancelledAt = new Date();
  await credit.save();
  return credit;
}

/**
 * Idempotent year-boundary expiry.
 *
 * Transitions every `available` credit whose `year` is strictly less than the
 * current IST calendar year to `expired`. A second invocation matches zero
 * documents because the `status` filter no longer holds (Property 10).
 *
 * @returns {Promise<{ matched: number, modified: number }>}
 */
export async function expireStaleFloatingCredits() {
  const currentIstYear = istYearOf(new Date());
  const result = await HolidayCredit.updateMany(
    { status: 'available', year: { $lt: currentIstYear } },
    { $set: { status: 'expired', expiredAt: new Date() } }
  );
  return {
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
  };
}

/**
 * Forfeit every `available` credit belonging to the given employee.
 *
 * Used when an employee transitions to `terminated` or `inactive`. Credits in
 * `redeemed`, `expired`, or `forfeited` are not re-touched (Property 11).
 *
 * @param {string} employeeId
 * @returns {Promise<{ matched: number, modified: number }>}
 */
export async function forfeitEmployeeCredits(employeeId) {
  const result = await HolidayCredit.updateMany(
    { employee: employeeId, status: 'available' },
    { $set: { status: 'forfeited', forfeitedAt: new Date() } }
  );
  return {
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
  };
}

/**
 * List all credits for an employee, grouped by template, with per-status counts.
 *
 * Used by both the employee self-service holiday view and the admin profile
 * holiday tabs (Requirement 9.3).
 *
 * @param {string} employeeId
 * @returns {Promise<Array<{
 *   template: { _id, name, year, type },
 *   counts: { available: number, redeemed: number, expired: number, forfeited: number },
 *   credits: Array<{ _id, sourceHolidayId, status, redeemedOn, redeemedAt }>,
 * }>>}
 */
export async function listCreditsForEmployee(employeeId) {
  const credits = await HolidayCredit.find({ employee: employeeId }).populate('template');

  const groups = new Map();
  for (const credit of credits) {
    const template = credit.template;
    if (!template) continue;
    const key = template._id.toString();
    if (!groups.has(key)) {
      groups.set(key, {
        template: {
          _id: template._id,
          name: template.name,
          year: template.year,
          type: template.type,
        },
        counts: { available: 0, redeemed: 0, expired: 0, forfeited: 0 },
        credits: [],
      });
    }
    const group = groups.get(key);
    if (group.counts[credit.status] !== undefined) {
      group.counts[credit.status] += 1;
    }
    group.credits.push({
      _id: credit._id,
      sourceHolidayId: credit.sourceHolidayId,
      status: credit.status,
      redeemedOn: credit.redeemedOn,
      redeemedAt: credit.redeemedAt,
    });
  }

  return Array.from(groups.values());
}

export default {
  redeemCredit,
  cancelRedemption,
  expireStaleFloatingCredits,
  forfeitEmployeeCredits,
  listCreditsForEmployee,
};
