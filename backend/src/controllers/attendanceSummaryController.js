import Attendance from '../models/attendanceSchema.js';
import Employee from '../models/employeeSchema.js';
import Salary from '../models/salarySchema.js';
import AdminAttendanceSettings from '../models/adminAttendanceSettingsSchema.js';
import mongoose from 'mongoose';
import {
  getEndOfIstDay,
  getIstDayKey,
  getIstDayOfWeek,
  getIstDayStartFromParts,
  getIstMonthRange,
  getStartOfIstDay,
  toIstDate,
} from '../utils/timezoneUtils.js';
import {
  getEmployeeHolidayDateSet,
  getEmployeesOnHoliday,
} from '../services/holidayPayrollService.js';

const getResolvedPayrollStatus = (attendance, settings) => {
  if (!attendance) return 'absent';

  if (attendance.manualPayrollStatus === 'leave') return 'leave';
  if (attendance.manualPayrollStatus === 'absent') return 'absent';
  if (attendance.manualPayrollStatus === 'half-day') return 'half-day';
  if (attendance.manualPayrollStatus === 'full-day') return 'full-day';

  const workingMinutes = Number(attendance.totalWorkingTime || 0);
  const minAbsentHours = Number(settings?.minAbsentHours || 180);
  const fullDayHours = Number(settings?.fullDayHours || 470);

  if (workingMinutes < minAbsentHours) return 'absent';
  if (workingMinutes < fullDayHours) return 'half-day';
  return 'full-day';
};

// Get Daily Attendance
export const getDailyAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const dayStart = getStartOfIstDay(date);
    const dayEnd = getEndOfIstDay(dayStart);

    // Get all employees count
    const totalEmployees = await Employee.countDocuments();
    const settings = await AdminAttendanceSettings.findOne().lean();

    // Pull every employee on holiday for this day so we can stamp the live
    // dashboard rows with status=Holiday before they fall into Absent.
    const holidayRows = await getEmployeesOnHoliday({ startDate: dayStart, endDate: dayEnd });
    const holidayInfoByEmployee = new Map(); // empId -> { name, source }
    holidayRows.forEach((row) => {
      const first = row.holidays[0] || {};
      holidayInfoByEmployee.set(String(row.employee._id), {
        name: first.name || null,
        source: first.source || null,
      });
    });

    const summary = await Attendance.aggregate([
      { $match: { date: { $gte: dayStart, $lte: dayEnd } } },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeDetails',
        },
      },
      { $unwind: '$employeeDetails' },
      {
        $project: {
          date: '$date',
          employeeName: '$employeeDetails.name',
          employeeEmail: '$employeeDetails.email',
          employeeId: '$employeeDetails._id',
          employeeCode: '$employeeDetails.employeeCode',
          checkInTime: '$checkInTime',
          checkInLocation: { $ifNull: ['$checkInLocation', 'N/A'] },
          checkOutTime: '$checkOutTime',
          checkOutLocation: { $ifNull: ['$checkOutLocation', 'N/A'] },
          totalWorkTime: { $ifNull: ['$totalWorkingTime', 0] },
          totalRecessDuration: { $ifNull: ['$totalRecessDuration', 0] },
          currentStatus: { $ifNull: ['$currentStatus', 'Unknown'] },
          lateCheckIn: { $ifNull: ['$lateCheckIn', false] },
          halfDay: { $ifNull: ['$halfDay', false] },
          manualPayrollStatus: { $ifNull: ['$manualPayrollStatus', null] },
        },
      },
    ]);

    const fullDayThresholdMinutes = Number(settings?.fullDayHours || 470);
    const halfDayThresholdMinutes = Number(settings?.halfDayHours || 240);
    const minAbsentHours = Number(settings?.minAbsentHours || 180);

    const normalizedSummary = summary.map((emp) => {
      // If checked out, use totalWorkTime; if still checked in, calculate working time from checkInTime to now
      let workingMinutes = emp.totalWorkTime;
      if (emp.checkInTime && !emp.checkOutTime) {
        // Employee checked in but not checked out yet - calculate working time from now
        const now = new Date();
        const checkInTime = new Date(emp.checkInTime);
        workingMinutes = Math.floor((now - checkInTime) / 60000); // Convert milliseconds to minutes
      }

      const holidayInfo = holidayInfoByEmployee.get(String(emp.employeeId));
      const isHoliday = Boolean(holidayInfo);

      const resolvedStatus = isHoliday
        ? 'holiday'
        : getResolvedPayrollStatus(
            {
              manualPayrollStatus: emp.manualPayrollStatus,
              totalWorkingTime: workingMinutes,
              halfDay: emp.halfDay,
            },
            settings
          );
      const hidePunchTimes = ['absent', 'leave', 'holiday'].includes(resolvedStatus);
      const currentStatus = isHoliday
        ? holidayInfo?.name
          ? `Holiday (${holidayInfo.name})`
          : 'Holiday'
        : resolvedStatus === 'full-day'
          ? 'Present'
          : resolvedStatus === 'half-day'
            ? 'Half Day'
            : resolvedStatus === 'leave'
              ? 'Leave'
              : 'Absent';

      return {
        ...emp,
        resolvedStatus,
        currentStatus,
        isHoliday,
        holidayName: holidayInfo?.name || null,
        holidaySource: holidayInfo?.source || null,
        totalWorkTime: workingMinutes,
        fullDayThresholdMinutes,
        halfDayThresholdMinutes,
        minAbsentHours,
        remainingToPresentMinutes: Math.max(
          fullDayThresholdMinutes - Number(workingMinutes || 0),
          0
        ),
        halfDay: resolvedStatus === 'half-day',
        hasCheckInPunch: !!emp.checkInTime,
        hasCheckOutPunch: !!emp.checkOutTime,
        originalCheckInTime: emp.checkInTime || 'N/A',
        originalCheckOutTime: emp.checkOutTime || 'N/A',
        checkInTime: hidePunchTimes ? 'N/A' : emp.checkInTime || 'N/A',
        checkOutTime: hidePunchTimes ? 'N/A' : emp.checkOutTime || 'N/A',
      };
    });

    // Return ALL records without filtering - let frontend display all statuses
    const present = normalizedSummary.filter((emp) =>
      ['full-day', 'half-day'].includes(emp.resolvedStatus)
    ).length;
    const absentFromAttendance = normalizedSummary.filter((emp) =>
      ['absent'].includes(emp.resolvedStatus)
    ).length;
    const onHolidayWithAttendance = normalizedSummary.filter((emp) => emp.isHoliday).length;
    // Total holiday count for the day = employees on holiday (regardless of
    // whether an attendance record exists). Subtract the ones we already
    // counted via attendance so the bucket doesn't double-count.
    const onHoliday = holidayInfoByEmployee.size;
    const holidaysWithoutAttendance = Math.max(onHoliday - onHolidayWithAttendance, 0);
    const employeesWithoutAttendance = Math.max(
      totalEmployees - normalizedSummary.length - holidaysWithoutAttendance,
      0
    );
    const absent = absentFromAttendance + employeesWithoutAttendance;
    // Counters drive the dashboard StatCard. Count from the normalized summary
    // so resolvedStatus drives inclusion -- a leave/holiday/absent row never
    // lights up "Checked In" or "Checked Out" even when raw punches exist.
    const checkedIn = normalizedSummary.filter(
      (emp) =>
        emp.hasCheckInPunch &&
        !emp.hasCheckOutPunch &&
        !['leave', 'holiday'].includes(emp.resolvedStatus)
    ).length;
    const checkedOut = normalizedSummary.filter(
      (emp) =>
        emp.hasCheckInPunch &&
        emp.hasCheckOutPunch &&
        !['leave', 'holiday'].includes(emp.resolvedStatus)
    ).length;
    const onLeave = normalizedSummary.filter((emp) => emp.resolvedStatus === 'leave').length;
    const late = normalizedSummary.filter((emp) => emp.lateCheckIn).length;

    res.status(200).json({
      message: 'Daily attendance fetched successfully',
      totalEmployees,
      present,
      absent,
      onLeave,
      onHoliday,
      checkedIn,
      checkedOut,
      late,
      fullDayThresholdMinutes,
      halfDayThresholdMinutes,
      minAbsentHours,
      summary: normalizedSummary,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching daily attendance', error: err.message });
  }
};

// Get Monthly Attendance
export const getMonthlyAttendance = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    const { start: startDate, end: endDate } = getIstMonthRange(Number(month), Number(year));

    // Admin monthly report mode: return all attendance entries for selected month.
    if (req.user.role === 'admin' && !employeeId) {
      const settings = await AdminAttendanceSettings.findOne().lean();
      const records = await Attendance.find({
        date: { $gte: startDate, $lte: endDate },
      })
        .populate('employee', 'name email employeeCode')
        .sort({ date: 1 });

      // Build a per-employee holiday set for the requested month so each
      // attendance row can be tagged when the day overlaps a holiday
      // assignment. Holidays here win over the working-hours resolver.
      const employeeIdsInScope = [
        ...new Set(records.map((r) => String(r.employee?._id)).filter(Boolean)),
      ];
      const holidaySetsByEmployee = new Map();
      const holidayInfoByKey = new Map();
      await Promise.all(
        employeeIdsInScope.map(async (empId) => {
          const { fixedDates, floatingDates, all } = await getEmployeeHolidayDateSet({
            employeeId: empId,
            month: Number(month),
            year: Number(year),
          });
          holidaySetsByEmployee.set(empId, all);
          for (const [k, v] of fixedDates) {
            holidayInfoByKey.set(`${empId}_${k}`, { name: v.name, source: 'fixed' });
          }
          for (const [k] of floatingDates) {
            // Don't overwrite a fixed entry if both exist on the same date.
            const key = `${empId}_${k}`;
            if (!holidayInfoByKey.has(key)) {
              holidayInfoByKey.set(key, { name: null, source: 'floating' });
            }
          }
        })
      );

      // Return ALL records without Sunday filter - display all statuses
      const attendanceData = records.map((record) => {
        // Compute resolved status using same logic as getDailyAttendance
        const workingMinutes = Number(record.totalWorkingTime || 0);
        const minAbsentHours = Number(settings?.minAbsentHours || 180);
        const fullDayHours = Number(settings?.fullDayHours || 470);

        const empKey = String(record.employee?._id || '');
        const dateKey = getIstDayKey(new Date(record.date));
        const holidaySet = holidaySetsByEmployee.get(empKey);
        const isHoliday = holidaySet ? holidaySet.has(dateKey) : false;
        const holidayInfo = isHoliday ? holidayInfoByKey.get(`${empKey}_${dateKey}`) : null;

        let resolvedStatus = 'present';
        if (isHoliday) {
          resolvedStatus = 'holiday';
        } else if (record.manualPayrollStatus === 'leave') {
          resolvedStatus = 'leave';
        } else if (record.manualPayrollStatus === 'absent') {
          resolvedStatus = 'absent';
        } else if (record.manualPayrollStatus === 'half-day') {
          resolvedStatus = 'half-day';
        } else if (record.manualPayrollStatus === 'full-day') {
          resolvedStatus = 'full-day';
        } else if (workingMinutes < minAbsentHours) {
          resolvedStatus = 'absent';
        } else if (workingMinutes < fullDayHours) {
          resolvedStatus = 'half-day';
        } else {
          resolvedStatus = 'full-day';
        }

        return {
          _id: record._id,
          employeeId: record.employee?._id?.toString() || '',
          employeeName: record.employee?.name || 'Unknown',
          employeeCode: record.employee?.employeeCode || '',
          date: record.date,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime || null,
          status: resolvedStatus,
          statusLabel: isHoliday
            ? holidayInfo?.name
              ? `Holiday (${holidayInfo.name})`
              : 'Holiday'
            : null,
          isHoliday,
          holidayName: holidayInfo?.name || null,
          holidaySource: holidayInfo?.source || null,
          actualHours: Number((workingMinutes / 60).toFixed(2)),
          totalWorkingTime: workingMinutes,
          totalRecessDuration: record.totalRecessDuration || 0,
        };
      });

      return res.status(200).json({
        message: 'Monthly attendance fetched successfully',
        attendanceData,
      });
    }

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid Employee ID' });
    }

    // Fetch attendance records
    const records = await Attendance.find({
      employee: new mongoose.Types.ObjectId(employeeId),
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // Return ALL records without filtering - display all statuses
    const totalWorkHours =
      records.reduce((total, record) => total + (record.totalWorkingTime || 0), 0) / 60;

    // Resolve this employee's holiday set for the month so per-day records
    // (and any synthesized holiday-only days) can carry status=Holiday.
    const settings = await AdminAttendanceSettings.findOne().lean();
    const {
      fixedDates,
      floatingDates,
      all: holidaySet,
    } = await getEmployeeHolidayDateSet({
      employeeId,
      month: Number(month),
      year: Number(year),
    });
    const holidayInfoByDate = new Map();
    for (const [k, v] of fixedDates) {
      holidayInfoByDate.set(k, { name: v.name, source: 'fixed' });
    }
    for (const [k] of floatingDates) {
      if (!holidayInfoByDate.has(k)) {
        holidayInfoByDate.set(k, { name: null, source: 'floating' });
      }
    }

    // Format records with derived status (Holiday wins, otherwise resolve from
    // working hours / manual override - same logic the admin monthly view
    // uses).
    const formattedRecords = records.map((record) => {
      const dateKey = getIstDayKey(new Date(record.date));
      const isHoliday = holidaySet.has(dateKey);
      const holidayInfo = isHoliday ? holidayInfoByDate.get(dateKey) : null;

      let status;
      if (isHoliday) {
        status = 'holiday';
      } else if (record.manualPayrollStatus) {
        status = record.manualPayrollStatus;
      } else {
        status = getResolvedPayrollStatus(record, settings);
      }

      const statusLabel = isHoliday
        ? holidayInfo?.name
          ? `Holiday (${holidayInfo.name})`
          : 'Holiday'
        : status === 'full-day'
          ? 'Present'
          : status === 'half-day'
            ? 'Half Day'
            : status === 'leave'
              ? 'On Leave'
              : status === 'absent'
                ? 'Absent'
                : 'Unknown';

      return {
        _id: record._id,
        date: record.date,
        checkInTime: record.checkInTime,
        checkInLocation: record.checkInLocation || 'N/A',
        checkOutTime: record.checkOutTime || 'N/A',
        checkOutLocation: record.checkOutLocation || 'N/A',
        totalWorkingTime: record.totalWorkingTime || 0,
        totalRecessDuration: record.totalRecessDuration || 0,
        status,
        statusLabel,
        currentStatus: statusLabel,
        isHoliday,
        holidayName: holidayInfo?.name || null,
        holidaySource: holidayInfo?.source || null,
      };
    });

    // Synthesize holiday-only rows for days the employee didn't punch in.
    // Without these the per-employee monthly history would hide the holiday
    // entirely, since there is no Attendance document to back it.
    const recordedDateKeys = new Set(records.map((record) => getIstDayKey(new Date(record.date))));
    const syntheticHolidayRecords = [];
    for (const dateKey of holidaySet) {
      if (recordedDateKeys.has(dateKey)) continue;
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateValue = getIstDayStartFromParts(y, m, d);
      const holidayInfo = holidayInfoByDate.get(dateKey);
      syntheticHolidayRecords.push({
        _id: `holiday-${employeeId}-${dateKey}`,
        date: dateValue,
        checkInTime: null,
        checkInLocation: 'N/A',
        checkOutTime: 'N/A',
        checkOutLocation: 'N/A',
        totalWorkingTime: 0,
        totalRecessDuration: 0,
        status: 'holiday',
        statusLabel: holidayInfo?.name ? `Holiday (${holidayInfo.name})` : 'Holiday',
        currentStatus: holidayInfo?.name ? `Holiday (${holidayInfo.name})` : 'Holiday',
        isHoliday: true,
        holidayName: holidayInfo?.name || null,
        holidaySource: holidayInfo?.source || null,
        synthetic: true,
      });
    }

    const combinedRecords = [...formattedRecords, ...syntheticHolidayRecords].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.status(200).json({
      message: 'Monthly attendance fetched successfully',
      totalWorkHours: `${totalWorkHours} hours`,
      records: combinedRecords,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching monthly attendance', error: err.message });
  }
};

// Get Absentee List
export const getAbsenteeList = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Parse dates in dd-mm-yyyy format
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return getIstDayStartFromParts(year, month, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    // Adjust end date to include the entire day
    const endOfDay = getEndOfIstDay(end);

    if (getIstDayKey(start) === getIstDayKey(end) && getIstDayOfWeek(start) === 0) {
      return res.status(200).json({
        message: 'Absentee list fetched successfully',
        totalAbsent: 0,
        absentEmployees: [],
      });
    }

    // Step 1: Fetch all employees
    const allEmployees = await Employee.find({}, '_id name email employeeCode');

    const settings = await AdminAttendanceSettings.findOne().lean();

    // Step 2: Fetch attendance records within the date range
    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: endOfDay },
    });

    // Employees are present only when resolved status is full-day or half-day.
    const presentEmployeeIds = new Set(
      attendanceRecords
        .filter((record) => {
          // If employee is checked in but not checked out, compute live working minutes
          let attendanceForStatus = record;
          if (record.checkInTime && !record.checkOutTime) {
            const now = new Date();
            const checkInTime = new Date(record.checkInTime);
            const workingMinutes = Math.floor((now - checkInTime) / 60000);
            attendanceForStatus = {
              ...(record.toObject ? record.toObject() : record),
              totalWorkingTime: workingMinutes,
            };
          }

          const resolvedStatus = getResolvedPayrollStatus(attendanceForStatus, settings);
          const isSunday = getIstDayOfWeek(record.date) === 0;
          if (isSunday && ['absent', 'leave'].includes(resolvedStatus)) {
            return false;
          }
          return ['full-day', 'half-day'].includes(resolvedStatus);
        })
        .map((record) => record.employee.toString())
    );

    // Step 3: Fetch employees on holiday (fixed templates + redeemed floating credits)
    const holidayRows = await getEmployeesOnHoliday({ startDate: start, endDate: endOfDay });
    const holidayEmployeeIds = new Set(holidayRows.map((row) => row.employee._id.toString()));

    // Step 4: Filter employees who are **absent** (not present and not on holiday)
    const absentEmployees = allEmployees.filter(
      (emp) =>
        !presentEmployeeIds.has(emp._id.toString()) && // Not present
        !holidayEmployeeIds.has(emp._id.toString()) // Not on holiday
    );

    res.status(200).json({
      message: 'Absentee list fetched successfully',
      totalAbsent: absentEmployees.length,
      absentEmployees,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching absentee list', error: err.message });
  }
};

// Get the absent dates for the currently authenticated employee in the given
// month/year. Mirrors the absent-detection rules used by getEmployeeAbsenteeList
// (working days minus holidays minus present/half/leave) but without the
// payroll/deduction calculations -- this endpoint is consumed by the employee
// history page tab and only needs the list of dates.
export const getEmployeeAbsentDays = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    const monthNum = Number(month);
    const yearNum = Number(year);
    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid month' });
    }
    if (!Number.isInteger(yearNum) || yearNum < 1970 || yearNum > 2100) {
      return res.status(400).json({ message: 'Invalid year' });
    }

    // Resolve the requesting employee. Admin callers may optionally target a
    // specific employee via ?employeeId=, employees only see themselves.
    let employeeId = req.user?._id || req.user?.id;
    if (req.user?.role === 'admin' && req.query.employeeId) {
      employeeId = req.query.employeeId;
    }
    if (!employeeId) {
      return res.status(401).json({ message: 'Authenticated employee not found' });
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid Employee ID' });
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const settings = await AdminAttendanceSettings.findOne().lean();
    const { start: rangeStart, end: rangeEnd } = getIstMonthRange(monthNum, yearNum);

    // Cap the range at "today" so future days don't show up as absent.
    const today = getEndOfIstDay(getStartOfIstDay());
    const effectiveEnd = rangeEnd < today ? rangeEnd : today;

    // If the employee joined later than the range start, only consider days on
    // or after the join date.
    const joinedDate = employee.joinedDate
      ? getIstDayStartFromParts(
          employee.joinedDate.getFullYear(),
          employee.joinedDate.getMonth() + 1,
          employee.joinedDate.getDate()
        )
      : null;
    const effectiveStart = joinedDate && joinedDate > rangeStart ? joinedDate : rangeStart;

    if (effectiveStart > effectiveEnd) {
      return res.status(200).json({
        message: 'Absent days fetched successfully',
        totalAbsents: 0,
        absentDays: [],
      });
    }

    // Resolve this employee's holiday set for the month so per-day records can
    // skip any day that is already a holiday for them.
    const { all: holidayDatesSet } = await getEmployeeHolidayDateSet({
      employeeId: employeeId.toString(),
      month: monthNum,
      year: yearNum,
    });

    // Walk every working day (Mon-Sat) in the effective range and look up the
    // resolved attendance status. Sundays are off, holidays are skipped.
    const attendanceRecords = await Attendance.find({
      employee: new mongoose.Types.ObjectId(employeeId),
      date: { $gte: effectiveStart, $lte: effectiveEnd },
    }).lean();
    const attendanceByDate = new Map(
      attendanceRecords.map((record) => [getIstDayKey(new Date(record.date)), record])
    );

    const absentDays = [];
    const cursor = new Date(effectiveStart);
    while (cursor <= effectiveEnd) {
      const dayOfWeek = getIstDayOfWeek(cursor);
      const dateKey = getIstDayKey(cursor);
      const skipForSunday = dayOfWeek === 0;
      const skipForHoliday = holidayDatesSet.has(dateKey);

      if (!skipForSunday && !skipForHoliday) {
        const record = attendanceByDate.get(dateKey);
        if (getResolvedPayrollStatus(record, settings) === 'absent') {
          // Use the IST day-start so the date renders consistently in the
          // employee's locale on the frontend.
          const [yyyy, mm, dd] = dateKey.split('-').map(Number);
          absentDays.push({
            date: getIstDayStartFromParts(yyyy, mm, dd),
            dateKey,
          });
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return res.status(200).json({
      message: 'Absent days fetched successfully',
      totalAbsents: absentDays.length,
      absentDays,
    });
  } catch (err) {
    console.error('Error in getEmployeeAbsentDays:', err);
    return res.status(500).json({ message: 'Error fetching absent days', error: err.message });
  }
};

// absentee list of a specific employee and then deduction
export const getEmployeeAbsenteeList = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Fetch employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const settings = await AdminAttendanceSettings.findOne().lean();

    // Fetch salary information
    const salary = await Salary.findOne({ employee: employeeId });
    if (!salary) {
      return res.status(404).json({ message: 'Salary information not found for employee' });
    }

    // Parse dates in dd-mm-yyyy format
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return getIstDayStartFromParts(year, month, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    // Get current date at start of day for consistent comparison
    const currentDate = getStartOfIstDay();

    // Adjust end date to be either the requested end date or current date, whichever is earlier
    const effectiveEndDate = getEndOfIstDay(
      new Date(Math.min(end.getTime(), currentDate.getTime()))
    );

    const joinedDate = employee.joinedDate
      ? getIstDayStartFromParts(
          employee.joinedDate.getFullYear(),
          employee.joinedDate.getMonth() + 1,
          employee.joinedDate.getDate()
        )
      : null;
    const rangeStart = joinedDate && joinedDate > start ? joinedDate : start;

    // Calculate total days in the month
    const totalDaysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

    // Calculate daily salary using salary schema
    const dailySalary = salary.baseSalary / totalDaysInMonth;

    // Helper function to format date to YYYY-MM-DD for comparison
    const formatDateForComparison = (date) => getIstDayKey(date);

    // Generate all working dates (Excluding Sundays)
    const getWorkingDates = (start, end) => {
      const dates = [];
      const current = new Date(start);
      while (current <= end) {
        if (getIstDayOfWeek(current) !== 0) {
          // Exclude Sundays
          dates.push(new Date(current));
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
      return dates;
    };

    const workingDates = getWorkingDates(rangeStart, effectiveEndDate);

    // Fetch employee-specific holiday dates from new template + credit sources.
    // Walk each month spanned by the range so we can reuse holidayPayrollService's
    // single-source-of-truth set, then union the per-month `all` sets.
    const monthsSpanned = [];
    const cursor = new Date(rangeStart);
    while (cursor <= effectiveEndDate) {
      const ist = toIstDate(cursor);
      const month = ist.getUTCMonth() + 1;
      const year = ist.getUTCFullYear();
      const key = `${year}-${month}`;
      if (!monthsSpanned.includes(key)) monthsSpanned.push(key);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const monthlySets = await Promise.all(
      monthsSpanned.map((key) => {
        const [year, month] = key.split('-').map(Number);
        return getEmployeeHolidayDateSet({ employeeId, month, year });
      })
    );
    const holidayDatesSet = new Set();
    for (const { all } of monthlySets) {
      for (const dateKey of all) holidayDatesSet.add(dateKey);
    }

    // Fetch attendance records
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: rangeStart, $lte: effectiveEndDate },
    });

    // console.log("Attendance Records:", attendanceRecords); // DEBUG LOG

    const attendanceByDate = new Map(
      attendanceRecords.map((record) => [formatDateForComparison(new Date(record.date)), record])
    );

    const absentDates = workingDates.filter((date) => {
      const formattedDate = formatDateForComparison(date);
      if (holidayDatesSet.has(formattedDate)) return false;

      const attendance = attendanceByDate.get(formattedDate);
      return getResolvedPayrollStatus(attendance, settings) === 'absent';
    });

    // console.log("Absent Dates:", absentDates); // DEBUG LOG

    // Format absent dates
    const formattedAbsentDates = absentDates.map((date) => ({
      date: date,
      formattedDate: date.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    }));

    // Calculate total deduction
    const totalAbsents = formattedAbsentDates.length;
    const totalDeduction = totalAbsents * dailySalary;

    res.status(200).json({
      message: 'Absentee list and deductions fetched successfully',
      employeeId,
      employeeName: employee.name,
      baseSalary: salary.baseSalary,
      dailySalary: dailySalary.toFixed(2),
      totalDaysInMonth,
      totalAbsents,
      totalDeduction: totalDeduction.toFixed(2),
      absentDates: formattedAbsentDates,
    });
  } catch (err) {
    console.error('Error in getEmployeeAbsenteeList:', err);
    res.status(500).json({ message: 'Error fetching absentee list', error: err.message });
  }
};

// present list of employees
export const getPresentList = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Parse dates in dd-mm-yyyy format
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return getIstDayStartFromParts(year, month, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    // Adjust end date to include the entire day
    const endOfDay = getEndOfIstDay(end);

    const settings = await AdminAttendanceSettings.findOne().lean();

    const isSundayAbsentOrLeave = (record) => {
      const resolvedStatus = getResolvedPayrollStatus(record, settings);
      return getIstDayOfWeek(record.date) === 0 && ['absent', 'leave'].includes(resolvedStatus);
    };

    const allEmployees = await Employee.find({}, '_id name email employeeCode');
    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: endOfDay },
    });

    const presentEmployeeIds = new Set(
      attendanceRecords
        .filter(
          (record) =>
            ['full-day', 'half-day'].includes(getResolvedPayrollStatus(record, settings)) &&
            !isSundayAbsentOrLeave(record)
        )
        .map((record) => record.employee.toString())
    );
    const presentEmployees = allEmployees.filter((emp) =>
      presentEmployeeIds.has(emp._id.toString())
    );

    res.status(200).json({
      message: 'Present list fetched successfully',
      presentEmployees,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching present list', error: err.message });
  }
};

// Get Half Days of an Employee with deduction
export const getEmployeeHalfDays = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    // Input validation
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Parse dates in dd-mm-yyyy format
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return getIstDayStartFromParts(year, month, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    // Get current date at start of day
    const currentDate = getStartOfIstDay();

    // Adjust end date to be either the requested end date or current date, whichever is earlier
    const effectiveEndDate = getEndOfIstDay(
      new Date(Math.min(end.getTime(), currentDate.getTime()))
    );

    // Fetch employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const settings = await AdminAttendanceSettings.findOne().lean();

    const joinedDate = employee.joinedDate
      ? getIstDayStartFromParts(
          employee.joinedDate.getFullYear(),
          employee.joinedDate.getMonth() + 1,
          employee.joinedDate.getDate()
        )
      : null;
    const rangeStart = joinedDate && joinedDate > start ? joinedDate : start;

    // Fetch attendance records and resolve half-day rows via attendance settings
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: rangeStart, $lte: effectiveEndDate },
    });

    // Format half-day records
    const halfDays = attendanceRecords
      .filter((record) => getResolvedPayrollStatus(record, settings) === 'half-day')
      .map((record) => ({
        date: record.date,
        formattedDate: record.date.toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        hoursWorked: record.totalWorkingTime ? (record.totalWorkingTime / 60).toFixed(2) : '0',
      }));

    // Fetch salary information
    const salary = await Salary.findOne({ employee: employeeId });
    if (!salary) {
      return res.status(404).json({ message: 'Salary information not found for employee' });
    }

    // Calculate total days in the month
    const totalDaysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const dailySalary = salary.baseSalary / totalDaysInMonth;

    // Calculate deductions
    const totalHalfDays = halfDays.length;
    const totalDeduction = (totalHalfDays * dailySalary) / 2; // Half day = half daily salary

    res.status(200).json({
      message: 'Half days data fetched successfully',
      employeeId,
      employeeName: employee.name,
      baseSalary: salary.baseSalary,
      dailySalary: dailySalary.toFixed(2),
      totalDaysInMonth,
      totalHalfDays,
      totalDeduction: totalDeduction.toFixed(2),
      halfDayDetails: halfDays,
    });
  } catch (err) {
    console.error('Error in getEmployeeHalfDays:', err);
    res.status(500).json({ message: 'Error fetching half days data', error: err.message });
  }
};

//get average working hours of of all employees by days of week
export const getAverageWorkingHoursByDayOfWeek = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return getIstDayStartFromParts(year, month, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    const endOfDay = getEndOfIstDay(end);

    // Fetch attendance records within the date range
    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: endOfDay },
    }).populate('employee', 'name email');

    const workingHoursByDay = {};
    const employeeCountByDay = {};

    // Map to store only the latest working hours per employee per day
    const uniqueEmployeeWorkHours = new Map();

    attendanceRecords.forEach((record) => {
      const dayOfWeek = getIstDayOfWeek(record.date);
      const employeeId = record.employee._id.toString();
      const workingHours = (record.totalWorkingTime || 0) / 60; // Convert minutes to hours

      if (!workingHoursByDay[dayOfWeek]) {
        workingHoursByDay[dayOfWeek] = {};
        employeeCountByDay[dayOfWeek] = new Set();
      }

      // Store only the latest working hours per employee per day
      if (!uniqueEmployeeWorkHours.has(`${dayOfWeek}-${employeeId}`)) {
        uniqueEmployeeWorkHours.set(`${dayOfWeek}-${employeeId}`, workingHours);
        workingHoursByDay[dayOfWeek][employeeId] = workingHours;
        employeeCountByDay[dayOfWeek].add(employeeId);
      }
    });

    const daysOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const averageWorkingHours = daysOfWeek.map((day, index) => {
      const totalEmployees = employeeCountByDay[index] ? employeeCountByDay[index].size : 0;
      const totalWorkingHours = Object.values(workingHoursByDay[index] || {}).reduce(
        (acc, cur) => acc + cur,
        0
      );

      return {
        day,
        averageWorkingHours: totalEmployees
          ? (totalWorkingHours / totalEmployees).toFixed(2)
          : '0.00',
        totalWorkingHours: totalWorkingHours.toFixed(2), // Now correctly converted to hours
        totalEmployees,
      };
    });

    res.status(200).json({
      message: 'Average working hours by day of week fetched successfully',
      averageWorkingHours,
    });
  } catch (err) {
    console.error('Error in getAverageWorkingHoursByDayOfWeek:', err);
    res
      .status(500)
      .json({ message: 'Error fetching average working hours by day of week', error: err.message });
  }
};
