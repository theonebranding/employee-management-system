import mongoose from 'mongoose';

const workflowInstanceStepSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sequence: { type: Number, required: true },
    approverType: {
      type: String,
      enum: ['manager', 'roleTemplate', 'specificUser'],
      required: true,
    },
    roleTemplate: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'escalated', 'skipped'],
      default: 'pending',
      index: true,
    },
    actedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    actedAt: { type: Date },
    decisionNote: { type: String, default: '' },
    dueAt: { type: Date },
  },
  { _id: false }
);

const workflowInstanceSchema = new mongoose.Schema(
  {
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    workflowKey: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    currentStepIndex: { type: Number, default: 0 },
    steps: { type: [workflowInstanceStepSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    lastEscalatedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'workflow_instances' }
);

workflowInstanceSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

const WorkflowInstance = mongoose.model('WorkflowInstance', workflowInstanceSchema);

export default WorkflowInstance;
