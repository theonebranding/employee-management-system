import mongoose from 'mongoose';

const AdminAttendanceSettingsSchema = new mongoose.Schema(
  {
    lateByMinutes: {
      type: Number,
      required: true,
      default: 20, // Default value, admin can change it
    },
    totalWorkingHours: {
      type: Number,
      required: true,
      default: 480, // Default required working minutes in a day
    },
    fullDayHours: {
      type: Number,
      required: true,
      default: 470, // If employee works >= this many minutes, it's a full-day
    },
    halfDayHours: {
      type: Number,
      required: true,
      default: 240, // If employee works >= this many minutes but < fullDayHours, it's a half-day (4 hours)
    },
    minAbsentHours: {
      type: Number,
      required: true,
      default: 180, // If employee works less than this minutes, they are absent (3 hours)
    },
    maxLateCheckIns: {
      type: Number,
      required: true,
      default: 5, // If employee is late more than this times, it's a half-day
    },
  },
  { timestamps: true }
);

const AdminAttendanceSettings = mongoose.model(
  'AdminAttendanceSettings',
  AdminAttendanceSettingsSchema
);

export default AdminAttendanceSettings;
