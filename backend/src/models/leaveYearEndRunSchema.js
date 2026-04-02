import mongoose from 'mongoose';

const leaveYearEndRunSchema = new mongoose.Schema(
  {
    sourceYear: { type: Number, required: true, index: true },
    targetYear: { type: Number, required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    summary: {
      balancesProcessed: { type: Number, default: 0 },
      carriedForwardDays: { type: Number, default: 0 },
      lapsedDays: { type: Number, default: 0 },
      errors: [{ type: String }],
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveYearEndRunSchema.index({ sourceYear: 1, targetYear: 1 }, { unique: true });

const LeaveYearEndRun = mongoose.model('LeaveYearEndRun', leaveYearEndRunSchema);

export default LeaveYearEndRun;
