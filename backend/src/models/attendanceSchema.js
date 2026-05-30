import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeEmail: { type: String, required: true },
    date: { type: Date, required: true },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },

    // Geolocation Data for Check-in & Check-out
    checkInLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    checkOutLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },

    // Attendance Status
    currentStatus: { type: String, default: 'Checked In' },

    // Recess Management
    recessStartTime: { type: Date },
    recessEndTime: { type: Date },
    totalRecessDuration: { type: Number, default: 0 }, // In minutes
    isRecess: { type: Boolean, default: false },

    // Check-in & Working Time Analysis
    lateCheckIn: { type: Boolean, default: false },
    earlyCheckOut: { type: Boolean, default: false },
    halfDay: { type: Boolean, default: false },
    totalWorkingTime: { type: Number, default: 0 }, // Store total working time in **minutes**

    // Admin payroll override for Attendance Master
    manualPayrollStatus: {
      type: String,
      enum: ['full-day', 'half-day', 'leave', 'absent'],
      default: null,
    },
    leaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leave',
      default: null,
    },
    generatedForLeave: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
