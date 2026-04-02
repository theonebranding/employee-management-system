import mongoose from 'mongoose';

const scheduledReportRunSchema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledReport', required: true, index: true },
    triggeredBy: {
      type: String,
      enum: ['scheduler', 'manual', 'system'],
      default: 'system',
      index: true,
    },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'AsyncJob', default: null },
    status: {
      type: String,
      enum: ['queued', 'success', 'failed'],
      default: 'queued',
      index: true,
    },
    format: { type: String, default: 'csv' },
    outputType: { type: String, default: '' },
    deliveredTo: [{ type: String }],
    bytes: { type: Number, default: 0 },
    preview: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

const ScheduledReportRun = mongoose.model('ScheduledReportRun', scheduledReportRunSchema);

export default ScheduledReportRun;
