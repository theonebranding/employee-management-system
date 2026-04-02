import mongoose from 'mongoose';

const workflowSlaEventSchema = new mongoose.Schema(
  {
    workflowInstanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowInstance',
      required: true,
      index: true,
    },
    stepSequence: { type: Number, required: true, index: true },
    eventType: {
      type: String,
      enum: ['deadline_reached', 'escalated', 'resolved'],
      required: true,
      index: true,
    },
    dueAt: { type: Date, required: true },
    occurredAt: { type: Date, default: Date.now },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    escalatedToRoleTemplate: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'workflow_sla_events' }
);

const WorkflowSlaEvent = mongoose.model('WorkflowSlaEvent', workflowSlaEventSchema);

export default WorkflowSlaEvent;
