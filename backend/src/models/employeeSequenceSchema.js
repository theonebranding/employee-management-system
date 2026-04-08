import mongoose from 'mongoose';

const employeeSequenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'employee_code',
    },
    sequence: {
      type: Number,
      default: 1000,
    },
  },
  { timestamps: true }
);

export default mongoose.model('EmployeeSequence', employeeSequenceSchema);
