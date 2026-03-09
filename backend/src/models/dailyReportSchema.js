import mongoose from 'mongoose';

const dailyReportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    dayKey: { type: String, required: true },
    reportDate: { type: Date, required: true },
    reportText: { type: String, default: 'N/A' },
    adminComment: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByRole: { type: String, enum: ['admin', 'employee', 'system'], required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId },
    updatedByRole: { type: String, enum: ['admin', 'employee', 'system'] },
  },
  { timestamps: true }
);

dailyReportSchema.index({ employee: 1, dayKey: 1 }, { unique: true });

const DailyReport = mongoose.model('DailyReport', dailyReportSchema);

export default DailyReport;
