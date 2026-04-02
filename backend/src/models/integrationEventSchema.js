import mongoose from 'mongoose';

const integrationEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['slack', 'teams', 'accounting', 'biometric', 'calendar'],
      required: true,
      index: true,
    },
    eventType: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['queued', 'processed', 'failed'],
      default: 'queued',
      index: true,
    },
    result: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

const IntegrationEvent = mongoose.model('IntegrationEvent', integrationEventSchema);

export default IntegrationEvent;
