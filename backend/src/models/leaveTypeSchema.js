import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    paid: { type: Boolean, default: true },
    accrualEnabled: { type: Boolean, default: true },
    monthlyAccrual: { type: Number, default: 1.5 },
    maxBalance: { type: Number, default: 30 },
    carryForwardLimit: { type: Number, default: 10 },
    encashmentEnabled: { type: Boolean, default: false },
    sandwichRuleEnabled: { type: Boolean, default: false },
    requiresDocumentAfterDays: { type: Number, default: 2 },
    locations: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

export default LeaveType;
