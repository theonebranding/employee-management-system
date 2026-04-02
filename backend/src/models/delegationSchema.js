import mongoose from 'mongoose';

const delegationSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    module: { type: String, default: 'workflow', index: true },
    reason: { type: String, default: '' },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true, collection: 'delegations' }
);

delegationSchema.index({ fromUser: 1, toUser: 1, startsAt: 1, endsAt: 1 }, { unique: true });

const Delegation = mongoose.model('Delegation', delegationSchema);

export default Delegation;
