import mongoose from 'mongoose';

const rotaAssignmentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    shiftTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftTemplate',
      required: true,
      index: true,
    },
    effectiveFrom: { type: Date, required: true, index: true },
    effectiveTo: { type: Date, required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

rotaAssignmentSchema.index({ employee: 1, effectiveFrom: 1, effectiveTo: 1 });

const RotaAssignment = mongoose.model('RotaAssignment', rotaAssignmentSchema);

export default RotaAssignment;
