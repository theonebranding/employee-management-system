import IntegrationEvent from '../models/integrationEventSchema.js';
import { registerJobProcessor } from './asyncJobService.js';

const markProcessed = async (eventId, result = {}) => {
  if (!eventId) return result;
  await IntegrationEvent.findByIdAndUpdate(eventId, {
    status: 'processed',
    result,
    error: '',
  });
  return result;
};

const markFailed = async (eventId, error) => {
  if (!eventId) return;
  await IntegrationEvent.findByIdAndUpdate(eventId, {
    status: 'failed',
    error: error.message,
  });
};

const withEventStatus = (handler) => async (payload) => {
  try {
    return await handler(payload);
  } catch (error) {
    await markFailed(payload?.eventId, error);
    throw error;
  }
};

export const registerIntegrationProcessors = () => {
  registerJobProcessor(
    'integration:slack:notification',
    withEventStatus(async (payload) =>
      markProcessed(payload.eventId, {
        provider: 'slack',
        delivered: true,
        deliveredAt: new Date().toISOString(),
        channels: payload.channels || [],
      })
    )
  );

  registerJobProcessor(
    'integration:teams:notification',
    withEventStatus(async (payload) =>
      markProcessed(payload.eventId, {
        provider: 'teams',
        delivered: true,
        deliveredAt: new Date().toISOString(),
        channels: payload.channels || [],
      })
    )
  );

  registerJobProcessor(
    'integration:accounting:export',
    withEventStatus(async (payload) =>
      markProcessed(payload.eventId, {
        provider: 'accounting',
        month: payload.month,
        year: payload.year,
        format: payload.format,
        fileName: `accounting-export-${payload.year}-${String(payload.month).padStart(2, '0')}.${payload.format}`,
        deliveredAt: new Date().toISOString(),
      })
    )
  );

  registerJobProcessor(
    'integration:biometric:ingest',
    withEventStatus(async (payload) =>
      markProcessed(payload.eventId, {
        provider: 'biometric',
        ingested: true,
        ingestedAt: new Date().toISOString(),
      })
    )
  );

  registerJobProcessor(
    'integration:calendar:ingest',
    withEventStatus(async (payload) =>
      markProcessed(payload.eventId, {
        provider: 'calendar',
        ingested: true,
        ingestedAt: new Date().toISOString(),
      })
    )
  );
};
