import express from 'express';
import {
  getIntegrationHealth,
  ingestBiometricEvent,
  ingestCalendarEvent,
  listIntegrationConfigs,
  listIntegrationEvents,
  retryIntegrationEvent,
  sendNotification,
  triggerAccountingExport,
  upsertIntegrationConfig,
} from '../controllers/integrationController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import auditLog from '../middleware/auditLog.js';
import checkPermission from '../middleware/checkPermission.js';
import validateZod from '../middleware/validateZod.js';
import verifyToken from '../middleware/verifyToken.js';
import {
  listIntegrationEventsQuerySchema,
  integrationEventIdParamSchema,
  providerParamSchema,
  sendNotificationSchema,
  triggerAccountingExportSchema,
  upsertIntegrationConfigSchema,
} from '../validations/integrationValidation.js';

const router = express.Router();

router.get(
  '/configs',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_CONFIG_MANAGE),
  listIntegrationConfigs
);

router.patch(
  '/configs/:provider',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_CONFIG_MANAGE),
  validateZod(providerParamSchema, 'params'),
  validateZod(upsertIntegrationConfigSchema),
  auditLog({ action: 'update', resource: 'integration-config' }),
  upsertIntegrationConfig
);

router.post(
  '/notify/:provider',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_NOTIFY_SEND),
  validateZod(providerParamSchema, 'params'),
  validateZod(sendNotificationSchema),
  auditLog({ action: 'create', resource: 'integration-notify' }),
  sendNotification
);

router.post(
  '/accounting/export',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_ACCOUNTING_EXPORT),
  validateZod(triggerAccountingExportSchema),
  auditLog({ action: 'create', resource: 'integration-accounting-export' }),
  triggerAccountingExport
);

router.post(
  '/biometric/ingest',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_DEVICE_INGEST),
  auditLog({ action: 'create', resource: 'integration-biometric-ingest' }),
  ingestBiometricEvent
);

router.post(
  '/calendar/ingest',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_DEVICE_INGEST),
  auditLog({ action: 'create', resource: 'integration-calendar-ingest' }),
  ingestCalendarEvent
);

router.get(
  '/events',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_CONFIG_MANAGE),
  validateZod(listIntegrationEventsQuerySchema, 'query'),
  listIntegrationEvents
);

router.get(
  '/health',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_CONFIG_MANAGE),
  getIntegrationHealth
);

router.post(
  '/events/:eventId/retry',
  verifyToken,
  checkPermission(PERMISSIONS.INTEGRATION_CONFIG_MANAGE),
  validateZod(integrationEventIdParamSchema, 'params'),
  auditLog({ action: 'create', resource: 'integration-event-retry' }),
  retryIntegrationEvent
);

export default router;
