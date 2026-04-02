import mongoose from 'mongoose';

const asyncJobSchema = new mongoose.Schema(
  {
    queue: {
      type: String,
      enum: ['notifications', 'scheduled-reports', 'leave-accrual', 'payroll', 'reminders', 'integrations'],
      required: true,
      index: true,
    },
    type: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    runAt: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String, default: '' },
    result: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const AsyncJob = mongoose.model('AsyncJob', asyncJobSchema);

export default AsyncJob;
