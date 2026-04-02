import mongoose from 'mongoose';

const integrationConfigSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['slack', 'teams', 'accounting', 'biometric', 'calendar'],
      required: true,
      unique: true,
      index: true,
    },
    enabled: { type: Boolean, default: false, index: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

const IntegrationConfig = mongoose.model('IntegrationConfig', integrationConfigSchema);

export default IntegrationConfig;
