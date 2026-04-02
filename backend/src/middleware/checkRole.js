import checkPermission from './checkPermission.js';
import { LEGACY_ROLE_TO_TEMPLATE, ROLE_TEMPLATE_PERMISSIONS } from '../constants/roleTemplates.js';

const checkRole = (allowedRoles) => {
  const allowedTemplates = (allowedRoles || [])
    .map((role) => LEGACY_ROLE_TO_TEMPLATE[role])
    .filter(Boolean);

  const permissionSet = new Set();
  allowedTemplates.forEach((template) => {
    const templatePermissions = ROLE_TEMPLATE_PERMISSIONS[template] || [];
    templatePermissions.forEach((permission) => permissionSet.add(permission));
  });

  return checkPermission([...permissionSet]);
};

export default checkRole;
