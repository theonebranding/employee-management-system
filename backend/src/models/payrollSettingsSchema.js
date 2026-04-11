import mongoose from 'mongoose';

const payrollSettingsSchema = new mongoose.Schema(
  {
    overtime: {
      enabled: {
        type: Boolean,
        default: true,
      },
      rateBasis: {
        type: String,
        enum: ['fixed', 'daily_wage'],
        default: 'fixed',
      },
      hourlyRate: {
        type: Number,
        default: 0,
      },
      dailyWageMultiplier: {
        type: Number,
        default: 1,
      },
      bufferMinutes: {
        type: String,
        default: '00:15',
      },
    },
    penalties: {
      enabled: {
        type: Boolean,
        default: true,
      },
      allowedDays: {
        type: Number,
        default: 3,
      },
      method: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed',
      },
      fixedPenaltyPerDay: {
        type: Number,
        default: 0,
      },
      dailyWageMultiplier: {
        type: Number,
        default: 0.5,
      },
      graceTime: {
        type: String,
        default: '00:20',
      },
    },
    extras: {
      defaultExtra: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('PayrollSettings', payrollSettingsSchema);
