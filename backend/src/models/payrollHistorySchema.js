import mongoose from 'mongoose';

const payrollHistorySchema = new mongoose.Schema(
  {
    payroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: true,
    },
    processedDate: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    notes: String,
    changes: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.model('PayrollHistory', payrollHistorySchema);
