import AuditLog from '../models/auditLogSchema.js';

const sanitizeBody = (body, keys = []) => {
  if (!body || typeof body !== 'object' || keys.length === 0) {
    return {};
  }

  const selected = {};
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      selected[key] = body[key];
    }
  });

  return selected;
};

const auditLog = ({ action, resource, bodyKeys = [] }) => {
  return (req, res, next) => {
    res.on('finish', async () => {
      try {
        const user = req.user || {};
        await AuditLog.create({
          actorId: user._id || null,
          actorEmail: user.email || '',
          actorRole: user.role || '',
          actorRoleTemplate: user.roleTemplate || '',
          action,
          resource,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          success: res.statusCode < 400,
          requestId: req.headers['x-request-id'] || '',
          ipAddress: req.ip || req.socket?.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
          metadata: {
            params: req.params,
            query: req.query,
            body: sanitizeBody(req.body, bodyKeys),
          },
        });
      } catch (error) {
        console.error('Audit logging failed:', error.message);
      }
    });

    next();
  };
};

export default auditLog;
