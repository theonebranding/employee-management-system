import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceSchema.js';
import Employee from '../src/models/employeeSchema.js';
import { getStartOfIstDay, getEndOfIstDay, getIstDayKey } from '../src/utils/timezoneUtils.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });
const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URI;

const run = async () => {
  await mongoose.connect(mongoUri);
  const dayStart = getStartOfIstDay();
  const dayEnd = getEndOfIstDay(dayStart);
  const todayKey = getIstDayKey(new Date());

  const todayAttendance = await Attendance.find({ date: { $gte: dayStart, $lte: dayEnd } })
    .select('employee date manualPayrollStatus checkInTime checkOutTime totalWorkingTime halfDay')
    .lean();

  const totalEmployees = await Employee.countDocuments();

  console.log('IST today key:', todayKey);
  console.log('IST dayStart:', dayStart.toISOString());
  console.log('IST dayEnd:', dayEnd.toISOString());
  console.log('Total employees:', totalEmployees);
  console.log('Today attendance records:', todayAttendance.length);

  const sample = todayAttendance.slice(0, 10).map((r) => ({
    employee: String(r.employee),
    date: r.date?.toISOString?.() || r.date,
    manualPayrollStatus: r.manualPayrollStatus || null,
    checkInTime: r.checkInTime?.toISOString?.() || r.checkInTime,
    checkOutTime: r.checkOutTime?.toISOString?.() || r.checkOutTime,
    totalWorkingTime: r.totalWorkingTime,
    halfDay: r.halfDay,
  }));
  console.log('Sample records:', JSON.stringify(sample, null, 2));

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e.message);
  await mongoose.disconnect();
  process.exit(1);
});
