import mongoose from 'mongoose';

const loanAdvanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: ['loan', 'advance'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionDate: {
      type: Date,
      required: true,
    },
    reference: String,
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    installmentType: {
      type: String,
      enum: ['monthly', 'tenure'],
      default: 'monthly',
    },
    monthlyInstallment: {
      type: Number,
      min: 0,
    },
    tenureMonths: {
      type: Number,
      min: 1,
    },
    comment: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    approvedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('LoanAdvance', loanAdvanceSchema);
