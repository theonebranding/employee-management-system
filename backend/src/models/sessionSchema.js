import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    email: { type: String, required: true, index: true },
    role: { type: String, required: true, index: true },
    roleTemplate: { type: String, default: '', index: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    deviceLabel: { type: String, default: '' },
    refreshTokenHash: { type: String, default: null },
    refreshTokenRotatedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    revokedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const Session = mongoose.model('Session', sessionSchema);

export default Session;
