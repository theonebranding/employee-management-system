import mongoose from 'mongoose';

const scheduledReportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    reportType: {
      type: String,
      enum: ['executive-kpi', 'attendance', 'leave', 'payroll-variance'],
      default: 'executive-kpi',
      index: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly',
      index: true,
    },
    schedule: {
      dayOfWeek: { type: Number, min: 0, max: 6, default: 1 },
      dayOfMonth: { type: Number, min: 1, max: 31, default: 1 },
      time: { type: String, default: '09:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    format: {
      type: String,
      enum: ['csv', 'xlsx', 'pdf'],
      default: 'csv',
    },
    recipients: [{ type: String }],
    filters: {
      month: { type: Number, min: 1, max: 12, default: null },
      year: { type: Number, default: null },
      department: { type: String, default: null },
      location: { type: String, default: null },
      managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    },
    isActive: { type: Boolean, default: true, index: true },
    lastRunAt: { type: Date, default: null },
    lastRunStatus: {
      type: String,
      enum: ['success', 'failed', 'never'],
      default: 'never',
    },
    lastRunResult: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

const ScheduledReport = mongoose.model('ScheduledReport', scheduledReportSchema);

export default ScheduledReport;
