import Permission from '../models/permissionSchema.js';
import RoleTemplate from '../models/roleTemplateSchema.js';
import { ALL_PERMISSIONS } from '../constants/permissions.js';
import {
  LEGACY_ROLE_TO_TEMPLATE,
  ROLE_TEMPLATES,
  ROLE_TEMPLATE_PERMISSIONS,
} from '../constants/roleTemplates.js';

const getPermissionParts = (key) => {
  const [module, resource, action] = key.split('.');
  return { module, resource, action };
};

export const seedRbacCore = async () => {
  const permissionDocuments = ALL_PERMISSIONS.map((key) => {
    const parts = getPermissionParts(key);
    return {
      updateOne: {
        filter: { key },
        update: {
          $set: {
            key,
            module: parts.module || 'system',
            resource: parts.resource || 'resource',
            action: parts.action || 'read',
            description: `${parts.module || 'system'}:${parts.resource || 'resource'}:${parts.action || 'read'}`,
            isActive: true,
          },
        },
        upsert: true,
      },
    };
  });

  if (permissionDocuments.length > 0) {
    await Permission.bulkWrite(permissionDocuments);
  }

  const roleTemplateOperations = Object.entries(ROLE_TEMPLATE_PERMISSIONS).map(
    ([name, permissions]) => ({
      updateOne: {
        filter: { name },
        update: {
          $set: {
            name,
            description: `${name} system template`,
            permissions,
            isSystem: true,
            isActive: true,
          },
        },
        upsert: true,
      },
    })
  );

  if (roleTemplateOperations.length > 0) {
    await RoleTemplate.bulkWrite(roleTemplateOperations);
  }
};

export const getPermissionsFromTemplate = async (templateName) => {
  if (!templateName) return [];

  const template = await RoleTemplate.findOne({ name: templateName, isActive: true }).lean();
  if (template?.permissions?.length) {
    return template.permissions;
  }

  return ROLE_TEMPLATE_PERMISSIONS[templateName] || [];
};

const toUniquePermissions = (permissions = []) => [...new Set(permissions.filter(Boolean))];

export const resolveUserPermissions = async (userPayload = {}) => {
  if (Array.isArray(userPayload.permissions) && userPayload.permissions.length > 0) {
    return toUniquePermissions(userPayload.permissions);
  }

  const mappedTemplate =
    userPayload.roleTemplate || LEGACY_ROLE_TO_TEMPLATE[userPayload.role] || ROLE_TEMPLATES.EMPLOYEE;

  return toUniquePermissions(await getPermissionsFromTemplate(mappedTemplate));
};

export const hasPermission = (userPermissions = [], requiredPermissions = []) => {
  const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  if (required.length === 0) return true;

  if (userPermissions.includes('*')) {
    return true;
  }

  return required.some((permission) => userPermissions.includes(permission));
};
