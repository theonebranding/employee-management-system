import express from 'express';
import {
  createOrgUnit,
  deleteOrgUnit,
  listOrgUnits,
  updateOrgUnit,
} from '../controllers/orgController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import auditLog from '../middleware/auditLog.js';
import checkPermission from '../middleware/checkPermission.js';
import validateZod from '../middleware/validateZod.js';
import verifyToken from '../middleware/verifyToken.js';
import {
  createOrgUnitSchema,
  listOrgUnitsQuerySchema,
  orgUnitIdParamSchema,
  updateOrgUnitSchema,
} from '../validations/orgValidation.js';

const router = express.Router();

router.post(
  '/',
  verifyToken,
  checkPermission(PERMISSIONS.ORG_UNIT_MANAGE),
  validateZod(createOrgUnitSchema),
  auditLog({ action: 'create', resource: 'org-unit', bodyKeys: ['type', 'code', 'name'] }),
  createOrgUnit
);

router.get(
  '/',
  verifyToken,
  checkPermission(PERMISSIONS.ORG_UNIT_READ),
  validateZod(listOrgUnitsQuerySchema, 'query'),
  listOrgUnits
);

router.patch(
  '/:id',
  verifyToken,
  checkPermission(PERMISSIONS.ORG_UNIT_MANAGE),
  validateZod(orgUnitIdParamSchema, 'params'),
  validateZod(updateOrgUnitSchema),
  auditLog({ action: 'update', resource: 'org-unit' }),
  updateOrgUnit
);

router.delete(
  '/:id',
  verifyToken,
  checkPermission(PERMISSIONS.ORG_UNIT_MANAGE),
  validateZod(orgUnitIdParamSchema, 'params'),
  auditLog({ action: 'delete', resource: 'org-unit' }),
  deleteOrgUnit
);

export default router;
