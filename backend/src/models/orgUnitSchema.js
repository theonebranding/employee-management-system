import mongoose from 'mongoose';

const orgUnitSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['department', 'team', 'location', 'cost-center'],
      required: true,
      index: true,
    },
    code: { type: String, required: true },
    name: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', default: null },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

orgUnitSchema.index({ type: 1, code: 1 }, { unique: true });

const OrgUnit = mongoose.model('OrgUnit', orgUnitSchema);

export default OrgUnit;
