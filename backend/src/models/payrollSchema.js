import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    employeeName: String,
    employeeEmail: String,
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    workingDays: Number,
    fullDays: Number,
    halfDays: Number,
    paidLeaves: Number,
    unpaidDays: Number,
    baseSalary: Number,
    dailyWage: Number,
    overtimeHours: {
      type: Number,
      default: 0,
    },
    overtimeAmount: {
      type: Number,
      default: 0,
    },
    penalties: {
      type: Number,
      default: 0,
    },
    loanAmount: {
      type: Number,
      default: 0,
    },
    extraAmount: {
      type: Number,
      default: 0,
    },
    leaveEncashmentAmount: {
      type: Number,
      default: 0,
    },
    totalSalary: Number,
    status: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    salaryRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salary',
    },
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    computedLoanAmount: Number,
    computedNetPay: Number,
    holidayBreakdown: {
      fixedDates: [
        {
          date: Date,
          name: String,
        },
      ],
      floatingDates: [
        {
          date: Date,
          creditId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HolidayCredit',
          },
        },
      ],
      totalAmount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Payroll', payrollSchema);
