import mongoose from 'mongoose';

const leaveAccrualRunSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    year: { type: Number, required: true, index: true },
    status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued', index: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    summary: {
      employeesProcessed: { type: Number, default: 0 },
      balancesUpdated: { type: Number, default: 0 },
      errors: [{ type: String }],
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveAccrualRunSchema.index({ year: 1, month: 1 }, { unique: true });

const LeaveAccrualRun = mongoose.model('LeaveAccrualRun', leaveAccrualRunSchema);

export default LeaveAccrualRun;
