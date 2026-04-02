import { hasPermission, resolveUserPermissions } from '../services/rbacService.js';

const checkPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const required = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];
      const resolvedPermissions = await resolveUserPermissions(req.user);
      req.user.permissions = resolvedPermissions;

      if (!hasPermission(resolvedPermissions, required)) {
        return res.status(403).json({
          message: 'Access denied. You do not have the required permissions.',
          requiredPermissions: required,
        });
      }

      return next();
    } catch (err) {
      return res.status(500).json({ message: 'Error verifying permissions', error: err.message });
    }
  };
};

export default checkPermission;
