import AuditLog from '../models/auditLogSchema.js';

export const listAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, resource, actorEmail, from, to, success } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filters = {};

    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (actorEmail) filters.actorEmail = actorEmail;
    if (success !== undefined) filters.success = success === 'true';

    if (from || to) {
      filters.createdAt = {};
      if (from) filters.createdAt.$gte = new Date(from);
      if (to) filters.createdAt.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filters).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      AuditLog.countDocuments(filters),
    ]);

    return res.status(200).json({
      message: 'Audit logs fetched successfully',
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
};
