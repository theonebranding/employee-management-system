import jwt from 'jsonwebtoken';
import { resolveUserPermissions } from '../services/rbacService.js';
import { LEGACY_ROLE_TO_TEMPLATE, ROLE_TEMPLATES } from '../constants/roleTemplates.js';

export const generateTokens = async (user, options = {}) => {
  const tokenSessionId = options.sessionId || options.sid;
  const sessionId = tokenSessionId ? String(tokenSessionId) : undefined;
  const roleTemplate = user.roleTemplate || LEGACY_ROLE_TO_TEMPLATE[user.role] || ROLE_TEMPLATES.EMPLOYEE;
  const permissions = await resolveUserPermissions({
    role: user.role,
    roleTemplate,
    permissions: user.permissions,
  });

  const accessPayload = {
    _id: user._id,
    email: user.email,
    role: user.role,
    roleTemplate,
    permissions,
  };

  if (sessionId) {
    accessPayload.sid = sessionId;
    accessPayload.sessionId = sessionId;
  }

  const accessToken = jwt.sign(
    accessPayload,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '12h' } // Access Token expires in 12 hours
  );

  const refreshPayload = { _id: user._id };

  if (sessionId) {
    refreshPayload.sid = sessionId;
    refreshPayload.sessionId = sessionId;
  }

  const refreshToken = jwt.sign(
    refreshPayload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Refresh Token expires in 7 days
  );

  return { accessToken, refreshToken, roleTemplate, permissions };
};
