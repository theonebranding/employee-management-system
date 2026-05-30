import mongoose from 'mongoose';

const leaveTemplateAssignmentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
    },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveTemplate', required: true },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const LeaveTemplateAssignment = mongoose.model(
  'LeaveTemplateAssignment',
  leaveTemplateAssignmentSchema
);
export default LeaveTemplateAssignment;
