import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    employeeEmail: { type: String, required: true },
    baseSalary: { type: Number, required: true },
    bonuses: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    lateComingDeductions: { type: Number, default: 0 },
    absenceDeductions: { type: Number, default: 0 },
    totalSalary: { type: Number, required: true, default: 0 },
    salaryMonth: { type: Number, min: 1, max: 12 },
    salaryYear: { type: Number },
    payrollRun: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', default: null, index: true },
    payrollLockState: {
      type: String,
      enum: ['unlocked', 'locked', 'released'],
      default: 'unlocked',
      index: true,
    },
    payslipStatus: { type: String, enum: ['draft', 'generated'], default: 'draft' },
    templateId: { type: String, default: 'classic-template' },
    templateName: { type: String, default: 'Classic Ledger' },
    payslipSnapshot: {
      companyName: { type: String, default: '' },
      companyAddress: { type: String, default: '' },
      companyEmail: { type: String, default: '' },
      companyPhone: { type: String, default: '' },
      logoData: { type: String, default: '' },
      signatureData: { type: String, default: '' },
      primaryColor: { type: String, default: '#0F766E' },
      secondaryColor: { type: String, default: '#E2E8F0' },
      footerNote: { type: String, default: '' },
    },
    generatedAt: { type: Date },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    emailedAt: { type: Date },
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Salary = mongoose.model('Salary', salarySchema);
export default Salary;
