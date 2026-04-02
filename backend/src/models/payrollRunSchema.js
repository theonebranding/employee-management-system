import mongoose from 'mongoose';

const payrollRunSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    year: { type: Number, required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'validated', 'locked', 'released'],
      default: 'draft',
      index: true,
    },
    scope: {
      department: { type: String, default: null, index: true },
      location: { type: String, default: null, index: true },
      costCenter: { type: String, default: null, index: true },
      employeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    },
    includedSalaryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Salary' }],
    totals: {
      headcount: { type: Number, default: 0 },
      gross: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
    },
    complianceSummary: {
      isCompliant: { type: Boolean, default: false },
      errors: [{ type: String }],
      warnings: [{ type: String }],
      generatedExports: [{ type: String }],
      validatedAt: { type: Date, default: null },
    },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    releasedAt: { type: Date, default: null },
    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    changeControlNote: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

payrollRunSchema.index({ year: 1, month: 1, 'scope.department': 1, 'scope.location': 1, 'scope.costCenter': 1 });

const PayrollRun = mongoose.model('PayrollRun', payrollRunSchema);

export default PayrollRun;
