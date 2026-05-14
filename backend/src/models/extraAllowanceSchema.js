import mongoose from 'mongoose';

const extraAllowanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
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
      enum: ['active', 'cancelled'],
      default: 'active',
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

export default mongoose.model('ExtraAllowance', extraAllowanceSchema);
