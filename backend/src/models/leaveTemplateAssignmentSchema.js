import mongoose from 'mongoose';

const leaveTemplateAssignmentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveTemplate', required: true },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

leaveTemplateAssignmentSchema.index({ employee: 1, template: 1 }, { unique: true });

const LeaveTemplateAssignment = mongoose.model(
  'LeaveTemplateAssignment',
  leaveTemplateAssignmentSchema
);
export default LeaveTemplateAssignment;
