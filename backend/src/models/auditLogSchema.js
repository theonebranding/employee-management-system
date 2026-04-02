import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, index: true },
    actorEmail: { type: String, default: '', index: true },
    actorRole: { type: String, default: '', index: true },
    actorRoleTemplate: { type: String, default: '', index: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true, index: true },
    success: { type: Boolean, required: true, index: true },
    requestId: { type: String, default: '', index: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
