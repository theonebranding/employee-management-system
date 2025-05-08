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
    halfDayHours: {
      type: Number,
      required: true,
      default: 300, // If employee works less than this minutes, it's a half-day
    },
    minAbsentHours: {
      type: Number,
      required: true,
      default: 180, // If employee works less than this minutes, they are absent
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
