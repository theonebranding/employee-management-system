import { z } from 'zod';

const providerSchema = z.enum(['slack', 'teams', 'accounting', 'biometric', 'calendar']);

export const providerParamSchema = z
  .object({
    provider: providerSchema,
  })
  .strict();

export const upsertIntegrationConfigSchema = z
  .object({
    enabled: z.boolean(),
    settings: z.record(z.any()).optional(),
  })
  .strict();

export const sendNotificationSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(2000),
    channels: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

export const triggerAccountingExportSchema = z
  .object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    format: z.enum(['csv', 'xlsx', 'json']).optional(),
  })
  .strict();

export const listIntegrationEventsQuerySchema = z
  .object({
    provider: providerSchema.optional(),
    status: z.enum(['queued', 'processed', 'failed']).optional(),
  })
  .strict();

export const integrationEventIdParamSchema = z
  .object({
    eventId: z.string().trim().min(1),
  })
  .strict();
