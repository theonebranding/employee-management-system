import mongoose from 'mongoose';

const payrollChangeControlSchema = new mongoose.Schema(
  {
    payrollRun: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
    action: {
      type: String,
      enum: ['unlock_request', 'unlock_approved', 'unlock_rejected', 'manual_adjustment'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    decisionNote: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

const PayrollChangeControl = mongoose.model('PayrollChangeControl', payrollChangeControlSchema);

export default PayrollChangeControl;
