import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../src/models/attendanceSchema.js';
import Employee from '../src/models/employeeSchema.js';
import { getIstDayStartFromParts, toIstDate } from '../src/utils/timezoneUtils.js';

dotenv.config();

const getPredefinedCheckInForDay = (dayStart, predefinedCheckInTime = '10:00') => {
  const [hours, minutes] = String(predefinedCheckInTime || '10:00')
    .split(':')
    .map((v) => Number(v || 0));
  return new Date(dayStart.getTime() + (hours * 60 + minutes) * 60 * 1000);
};

const main = async () => {
  const mongoUri =
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/test';
  if (!mongoUri) throw new Error('Missing MONGO_URL/MONGO_URI/MONGODB_URI in environment');

  await mongoose.connect(mongoUri);

  const records = await Attendance.find({
    manualPayrollStatus: { $in: ['full-day', 'half-day', 'leave', 'absent'] },
  });
  let updated = 0;

  for (const record of records) {
    const employee = await Employee.findById(record.employee).select('predefinedCheckInTime');
    if (!employee) continue;

    const istDate = toIstDate(record.date);
    const dayStart = getIstDayStartFromParts(
      istDate.getUTCFullYear(),
      istDate.getUTCMonth() + 1,
      istDate.getUTCDate()
    );

    const checkIn = getPredefinedCheckInForDay(dayStart, employee.predefinedCheckInTime);

    let minutes = 0;
    if (record.manualPayrollStatus === 'full-day') minutes = 8 * 60;
    if (record.manualPayrollStatus === 'half-day') minutes = 4 * 60;

    const checkOut = new Date(checkIn.getTime() + minutes * 60 * 1000);

    record.checkInTime = checkIn;
    record.checkOutTime = checkOut;
    record.totalWorkingTime = minutes;
    record.halfDay = record.manualPayrollStatus === 'half-day';

    await record.save();
    updated += 1;
  }

  console.log(`Updated attendance records: ${updated}`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Fix failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
