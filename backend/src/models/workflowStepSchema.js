import mongoose from 'mongoose';

const workflowStepSchema = new mongoose.Schema(
  {
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    name: { type: String, required: true },
    sequence: { type: Number, required: true, index: true },
    approverType: {
      type: String,
      enum: ['manager', 'roleTemplate', 'specificUser'],
      required: true,
    },
    roleTemplate: { type: String },
    approverUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    slaHours: { type: Number, default: 24 },
    escalationRoleTemplate: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'workflow_steps' }
);

workflowStepSchema.index({ workflowId: 1, sequence: 1 }, { unique: true });

const WorkflowStep = mongoose.model('WorkflowStep', workflowStepSchema);

export default WorkflowStep;
