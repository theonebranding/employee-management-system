import mongoose from 'mongoose';

const templateAssignmentSchema = new mongoose.Schema(
  {
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HolidayTemplate',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index makes bulk assign idempotent (Requirements 2.2, 10.4)
templateAssignmentSchema.index({ template: 1, employee: 1 }, { unique: true });

// Secondary index for the per-employee payroll lookup path
templateAssignmentSchema.index({ employee: 1 });

const TemplateAssignment = mongoose.model('TemplateAssignment', templateAssignmentSchema);
export default TemplateAssignment;
