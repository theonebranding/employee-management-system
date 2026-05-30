import mongoose from 'mongoose';

const leaveTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    autoAllocationCount: { type: Number, default: 0 },
    autoAllocationPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    carryForwardCount: { type: Number, default: 0 },
    carryForwardPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    effectiveDate: { type: Date, default: Date.now },
    encashmentAllowed: { type: Boolean, default: false },
    requiresDocument: { type: Boolean, default: false },
    autoApprove: { type: Boolean, default: true },
    countAsPaidLeave: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const LeaveTemplate = mongoose.model('LeaveTemplate', leaveTemplateSchema);
export default LeaveTemplate;
