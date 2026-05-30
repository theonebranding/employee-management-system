import Attendance from '../models/attendanceSchema.js';
import Employee from '../models/employeeSchema.js';
import { getStartOfIstDay, getEndOfIstDay } from './timezoneUtils.js';

const getDefaultCheckInTime = (dayStart, predefinedCheckInTime = '10:00') => {
  const [hours, minutes] = String(predefinedCheckInTime || '10:00')
    .split(':')
    .map((value) => Number(value || 0));

  return new Date(dayStart.getTime() + (hours * 60 + minutes) * 60 * 1000);
};

const buildIstDayRange = (startDate, endDate) => {
  const start = getStartOfIstDay(startDate);
  const end = getEndOfIstDay(endDate);
  const days = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
};

export const syncLeaveAttendanceMaster = async ({ leaveId, employeeId, startDate, endDate }) => {
  const employee = await Employee.findById(employeeId).select('email predefinedCheckInTime').lean();
  if (!employee) {
    throw new Error('Employee not found');
  }

  const days = buildIstDayRange(startDate, endDate);

  for (const dayStart of days) {
    const dayEnd = getEndOfIstDay(dayStart);
    const fallbackCheckIn = getDefaultCheckInTime(dayStart, employee.predefinedCheckInTime);
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (!existingAttendance) {
      const leaveAttendance = new Attendance({
        employee: employeeId,
        employeeEmail: employee.email,
        date: dayStart,
        checkInTime: fallbackCheckIn,
        checkOutTime: fallbackCheckIn,
        totalWorkingTime: 0,
        currentStatus: 'Leave',
        manualPayrollStatus: 'leave',
        leaveId,
        generatedForLeave: true,
      });

      await leaveAttendance.save();
      continue;
    }

    existingAttendance.manualPayrollStatus = 'leave';
    existingAttendance.leaveId = leaveId;
    existingAttendance.generatedForLeave = false;
    existingAttendance.currentStatus = 'Leave';

    if (!existingAttendance.checkInTime) {
      existingAttendance.checkInTime = fallbackCheckIn;
    }
    if (!existingAttendance.checkOutTime) {
      existingAttendance.checkOutTime = fallbackCheckIn;
    }
    if (!Number.isFinite(existingAttendance.totalWorkingTime)) {
      existingAttendance.totalWorkingTime = 0;
    }

    await existingAttendance.save();
  }
};

export const clearLeaveAttendanceMaster = async (leaveId) => {
  const attendanceRows = await Attendance.find({ leaveId }).lean();

  for (const row of attendanceRows) {
    if (row.generatedForLeave) {
      await Attendance.deleteOne({ _id: row._id });
      continue;
    }

    await Attendance.updateOne(
      { _id: row._id },
      {
        $unset: { leaveId: '', generatedForLeave: '' },
        $set: { manualPayrollStatus: null, currentStatus: row.checkOutTime ? 'Checked Out' : 'Checked In' },
      }
    );
  }
};