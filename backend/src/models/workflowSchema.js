import mongoose from 'mongoose';

const workflowStepTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sequence: { type: Number, required: true },
    approverType: {
      type: String,
      enum: ['manager', 'roleTemplate', 'specificUser'],
      default: 'roleTemplate',
      required: true,
    },
    roleTemplate: { type: String },
    approverUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    slaHours: { type: Number, default: 24 },
    escalationRoleTemplate: { type: String },
  },
  { _id: false }
);

const workflowSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    module: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    steps: {
      type: [workflowStepTemplateSchema],
      default: [],
      validate: {
        validator: (steps) => Array.isArray(steps) && steps.length > 0,
        message: 'Workflow must contain at least one step',
      },
    },
  },
  { timestamps: true, collection: 'workflows' }
);

const Workflow = mongoose.model('Workflow', workflowSchema);

export default Workflow;
