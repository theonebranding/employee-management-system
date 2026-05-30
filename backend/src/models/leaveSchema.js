import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    // employeeName: { type: String, required: true },
    employeeEmail: { type: String, required: true },
    leaveMode: { type: String, enum: ['template', 'special'], default: 'special' },
    leaveCategory: { type: String, default: null },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveTemplate', default: null },
    templateName: { type: String, default: null },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isTemplateBased: { type: Boolean, default: false },
    isPaidLeave: { type: Boolean, default: false },
    quotaDaysUsed: { type: Number, default: 0 },
    paidDays: { type: Number, default: 0 },
    unpaidDays: { type: Number, default: 0 },
    documentName: { type: String, default: null },
    documentType: { type: String, default: null },
    documentData: { type: String, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
