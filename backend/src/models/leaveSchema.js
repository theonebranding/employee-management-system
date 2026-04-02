import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    // employeeName: { type: String, required: true },
    employeeEmail: { type: String, required: true },
    leaveTypeCode: { type: String, default: 'ANNUAL', index: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    workflowInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowInstance' },
    currentApprovalStep: { type: Number, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberOfDays: { type: Number, default: 0 },
    sandwichDays: { type: Number, default: 0 },
    overlapConflict: { type: Boolean, default: false },
    overlapConflictMessage: { type: String, default: '' },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
