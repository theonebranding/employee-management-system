import mongoose from 'mongoose';
import Attendance from '../models/attendanceSchema.js';
import Employee from '../models/employeeSchema.js';
import Payroll from '../models/payrollSchema.js';
import AdminAttendanceSettings from '../models/adminAttendanceSettingsSchema.js';
import { recomputePayrollForAttendanceChange } from './payrollController.js';
import { getIstDayKey, getIstDayOfWeek, getIstDayStartFromParts } from '../utils/timezoneUtils.js';

const parseYmd = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return getIstDayStartFromParts(year, month, day);
};

const toYmd = (date) => {
  return getIstDayKey(date);
};
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getPredefinedCheckInForDay = (dayStart, predefinedCheckInTime = '10:00') => {
  const [hours, minutes] = String(predefinedCheckInTime || '10:00')
    .split(':')
    .map((v) => Number(v || 0));
  return new Date(dayStart.getTime() + (hours * 60 + minutes) * 60 * 1000);
};

// Calculate status based on actual working hours and attendance settings
const calculateStatusFromWorkingHours = (attendance, settings) => {
  if (!attendance) return 'absent';

  const workingMinutes = attendance.totalWorkingTime || 0;
  const minAbsentHours = settings?.minAbsentHours || 180;
  const halfDayHours = settings?.halfDayHours || 240;
  const fullDayHours = settings?.fullDayHours || 470;

  if (workingMinutes < minAbsentHours) {
    return 'absent';
  } else if (workingMinutes < fullDayHours) {
    return 'half-day';
  } else {
    return 'full-day';
  }
};

export const getAttendanceMaster = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = parseYmd(startDate);
    const end = parseYmd(endDate);
    if (!start || !end) return res.status(400).json({ message: 'Invalid date format (YYYY-MM-DD)' });

    // Fetch attendance settings to apply them to status calculation
    const settings = await AdminAttendanceSettings.findOne().lean();

    const employeeQuery = employeeId ? { _id: employeeId } : {};
    const employees = await Employee.find(employeeQuery)
      .select('_id name employeeCode department designation joinedDate')
      .lean();

    const rangeStart = start <= end ? start : end;
    const rangeEnd = start <= end ? end : start;

    const payrollMonthKeys = new Set();
    const monthCursor = new Date(rangeStart);
    while (monthCursor <= rangeEnd) {
      payrollMonthKeys.add(`${monthCursor.getUTCFullYear()}-${String(monthCursor.getUTCMonth() + 1).padStart(2, '0')}`);
      monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1, 1);
    }

    const payrollMonthClauses = [...payrollMonthKeys].map((key) => {
      const [year, month] = key.split('-').map(Number);
      return { year, month };
    });

    const payrolls = await Payroll.find({
      employee: { $in: employees.map((e) => e._id) },
      $or: payrollMonthClauses,
    })
      .select('employee month year status')
      .lean();

    const payrollByEmployeeMonth = new Map();
    payrolls.forEach((item) => {
      payrollByEmployeeMonth.set(
        `${String(item.employee)}_${String(item.year)}-${String(item.month).padStart(2, '0')}`,
        item.status || 'unpaid'
      );
    });

    const attendanceRecords = await Attendance.find({
      employee: { $in: employees.map((e) => e._id) },
      date: { $gte: rangeStart, $lte: new Date(rangeEnd.getTime() + 24 * 60 * 60 * 1000 - 1) },
    }).lean();

    const byKey = new Map();
    attendanceRecords.forEach((record) => {
      byKey.set(`${String(record.employee)}_${toYmd(record.date)}`, record);
    });

    const rows = [];
    employees.forEach((emp) => {
      const joinedDate = emp.joinedDate ? new Date(emp.joinedDate) : null;
      if (joinedDate && !Number.isNaN(joinedDate.getTime()) && joinedDate > rangeEnd) {
        return;
      }

      const cursor = new Date(
        joinedDate && !Number.isNaN(joinedDate.getTime()) && joinedDate > rangeStart
          ? joinedDate
          : rangeStart
      );
      while (cursor <= rangeEnd) {
        const dayStr = toYmd(cursor);
        const key = `${String(emp._id)}_${dayStr}`;
        const attendance = byKey.get(key);
        const isSunday = getIstDayOfWeek(cursor) === 0;

        // Match payroll working-day behavior: skip Sundays unless employee actually checked in.
        if (isSunday && !attendance?.checkInTime) {
          cursor.setUTCDate(cursor.getUTCDate() + 1);
          continue;
        }

        const payrollMonthKey = `${dayStr.slice(0, 4)}-${dayStr.slice(5, 7)}`;
        const payrollStatus =
          payrollByEmployeeMonth.get(`${String(emp._id)}_${payrollMonthKey}`) || 'unpaid';
        
        // Apply attendance settings: if manual status is set, use it; otherwise calculate from working hours
        let resolvedStatus;
        if (attendance?.manualPayrollStatus) {
          resolvedStatus = attendance.manualPayrollStatus;
        } else {
          resolvedStatus = calculateStatusFromWorkingHours(attendance, settings);
        }
        
        const isSundayAbsentOrLeave = isSunday && (resolvedStatus === 'absent' || resolvedStatus === 'leave');

        if (isSundayAbsentOrLeave) {
          cursor.setUTCDate(cursor.getUTCDate() + 1);
          continue;
        }

        const hidePunchTimes = ['absent', 'leave'].includes(attendance?.manualPayrollStatus);
        const statusLabel =
          attendance?.checkInTime && !attendance?.checkOutTime && !attendance?.manualPayrollStatus
            ? 'Checkout Pending'
            : resolvedStatus === 'absent' && !attendance?.manualPayrollStatus && attendance?.checkInTime
            ? 'Absent (Early Checkout)'
            : resolvedStatus === 'full-day'
              ? 'Full Day'
              : resolvedStatus === 'half-day'
                ? 'Half Day'
                : resolvedStatus === 'leave'
                  ? 'Leave'
                  : 'Absent';
        rows.push({
          employeeId: emp._id,
          employeeCode: emp.employeeCode || '',
          employeeName: emp.name || '',
          department: emp.department || '-',
          designation: emp.designation || '-',
          date: dayStr,
          day: weekdayNames[getIstDayOfWeek(cursor)],
          checkInTime: hidePunchTimes ? null : attendance?.checkInTime || null,
          checkOutTime: hidePunchTimes ? null : attendance?.checkOutTime || null,
          totalWorkingTime: attendance?.totalWorkingTime || 0,
          totalRecessDuration: attendance?.totalRecessDuration || 0,
          attendanceId: attendance?._id || null,
          status: resolvedStatus,
          statusLabel,
          payrollStatus,
          canEdit: payrollStatus !== 'paid',
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    });

    res.status(200).json({ message: 'Attendance master fetched', rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance master', error: error.message });
  }
};

export const updateAttendanceMasterStatus = async (req, res) => {
  try {
    const { employeeId, date, status } = req.body;
    if (!employeeId || !date || !status) {
      return res.status(400).json({ message: 'employeeId, date and status are required' });
    }

    const allowed = ['full-day', 'half-day', 'leave', 'absent'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const payroll = await Payroll.findOne({ employee: employeeId, month: Number(date.slice(5, 7)), year: Number(date.slice(0, 4)) });
    if (payroll?.status === 'paid') {
      return res.status(409).json({ message: 'Cannot update attendance master for paid payroll month' });
    }

    const dayStart = parseYmd(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    let attendance = await Attendance.findOne({ employee: employeeId, date: { $gte: dayStart, $lte: dayEnd } });

    if (!attendance) {
      attendance = new Attendance({
        employee: employeeId,
        employeeEmail: employee.email,
        date: dayStart,
        checkInTime: getPredefinedCheckInForDay(dayStart, employee.predefinedCheckInTime),
        checkOutTime: new Date(
          getPredefinedCheckInForDay(dayStart, employee.predefinedCheckInTime).getTime() +
            8 * 60 * 60 * 1000
        ),
        totalWorkingTime: 0,
      });
    }

    const predefinedCheckIn = getPredefinedCheckInForDay(dayStart, employee.predefinedCheckInTime);
    const checkInBase = predefinedCheckIn;

    attendance.manualPayrollStatus = status;
    attendance.halfDay = status === 'half-day';

    if (status === 'full-day') {
      attendance.checkInTime = checkInBase;
      attendance.checkOutTime = new Date(checkInBase.getTime() + 8 * 60 * 60 * 1000);
      attendance.totalWorkingTime = 8 * 60;
    } else if (status === 'half-day') {
      attendance.checkInTime = checkInBase;
      attendance.checkOutTime = new Date(checkInBase.getTime() + 4 * 60 * 60 * 1000);
      attendance.totalWorkingTime = 4 * 60;
    } else if (status === 'leave') {
      attendance.checkInTime = checkInBase;
      attendance.checkOutTime = checkInBase;
      attendance.totalWorkingTime = 0;
    } else if (status === 'absent') {
      attendance.checkInTime = checkInBase;
      attendance.checkOutTime = checkInBase;
      attendance.totalWorkingTime = 0;
    }

    await attendance.save();

    await recomputePayrollForAttendanceChange({
      employeeId,
      month: Number(date.slice(5, 7)),
      year: Number(date.slice(0, 4)),
      processedBy: req.user?._id,
    });

    res.status(200).json({ message: 'Attendance master status updated', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Error updating attendance master status', error: error.message });
  }
};

export const updateAttendanceMasterCheckout = async (req, res) => {
  try {
    const { employeeId, date, checkoutHour } = req.body;
    if (!employeeId || !date || checkoutHour === undefined) {
      return res.status(400).json({ message: 'employeeId, date and checkoutHour are required' });
    }

    const payroll = await Payroll.findOne({ employee: employeeId, month: Number(date.slice(5, 7)), year: Number(date.slice(0, 4)) });
    if (payroll?.status === 'paid') {
      return res.status(409).json({ message: 'Cannot update attendance master for paid payroll month' });
    }

    const dayStart = parseYmd(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    let attendance = await Attendance.findOne({ employee: employeeId, date: { $gte: dayStart, $lte: dayEnd } });

    if (!attendance) {
      const predefinedCheckIn = getPredefinedCheckInForDay(dayStart, employee.predefinedCheckInTime);
      attendance = new Attendance({
        employee: employeeId,
        employeeEmail: employee.email,
        date: dayStart,
        checkInTime: predefinedCheckIn,
        checkOutTime: new Date(predefinedCheckIn.getTime() + 8 * 60 * 60 * 1000),
        totalWorkingTime: 0,
      });
    }

    const checkoutDate = new Date(dayStart);
    checkoutDate.setHours(checkoutHour, 0, 0, 0);
    attendance.checkOutTime = checkoutDate;

    // Calculate working time if check-in exists
    if (attendance.checkInTime) {
      const workingMs = attendance.checkOutTime.getTime() - attendance.checkInTime.getTime();
      attendance.totalWorkingTime = Math.max(0, Math.round(workingMs / 60000));
    }

    await attendance.save();

    await recomputePayrollForAttendanceChange({
      employeeId,
      month: Number(date.slice(5, 7)),
      year: Number(date.slice(0, 4)),
      processedBy: req.user?._id,
    });

    res.status(200).json({ message: 'Checkout time updated', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Error updating checkout time', error: error.message });
  }
};
