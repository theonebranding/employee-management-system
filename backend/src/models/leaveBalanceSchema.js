import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeCode: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },
    openingBalance: { type: Number, default: 0 },
    accrued: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    encashed: { type: Number, default: 0 },
    lapsed: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    lastAccrualAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employee: 1, leaveTypeCode: 1, year: 1 }, { unique: true });

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

export default LeaveBalance;
