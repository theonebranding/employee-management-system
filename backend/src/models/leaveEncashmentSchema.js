import mongoose from 'mongoose';

const leaveEncashmentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeCode: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },
    daysRequested: { type: Number, required: true, min: 0.5 },
    daysApproved: { type: Number, default: 0 },
    amountPerDay: { type: Number, default: 0 },
    amountTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true,
    },
    note: { type: String, default: '' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    decidedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const LeaveEncashment = mongoose.model('LeaveEncashment', leaveEncashmentSchema);

export default LeaveEncashment;
