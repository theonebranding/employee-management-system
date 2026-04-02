import IntegrationConfig from '../models/integrationConfigSchema.js';
import IntegrationEvent from '../models/integrationEventSchema.js';
import { enqueueJob } from '../services/asyncJobService.js';

const resolveJobType = (provider, eventType) => {
  if (provider === 'accounting' && eventType === 'payroll-export') return 'integration:accounting:export';
  if (provider === 'biometric' && eventType === 'attendance-device-event') return 'integration:biometric:ingest';
  if (provider === 'calendar' && eventType === 'calendar-event-sync') return 'integration:calendar:ingest';
  if (provider === 'slack' && eventType === 'notification') return 'integration:slack:notification';
  if (provider === 'teams' && eventType === 'notification') return 'integration:teams:notification';
  return null;
};

const resolveProviderConfig = async (provider) => {
  const config = await IntegrationConfig.findOne({ provider });
  if (!config) {
    return IntegrationConfig.create({ provider, enabled: false, settings: {} });
  }
  return config;
};

export const listIntegrationConfigs = async (req, res) => {
  try {
    const configs = await IntegrationConfig.find().sort({ provider: 1 });
    return res.status(200).json({ message: 'Integration configs fetched successfully', configs });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching integration configs', error: error.message });
  }
};

export const upsertIntegrationConfig = async (req, res) => {
  try {
    const { provider } = req.params;
    const { enabled, settings = {} } = req.body;

    const config = await IntegrationConfig.findOneAndUpdate(
      { provider },
      {
        $set: {
          provider,
          enabled: Boolean(enabled),
          settings,
          updatedBy: req.user?._id || null,
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ message: 'Integration config updated successfully', config });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error updating integration config', error: error.message });
  }
};

export const sendNotification = async (req, res) => {
  try {
    const { provider } = req.params;
    const { title, message, channels = [] } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    const config = await resolveProviderConfig(provider);
    if (!config.enabled) {
      return res.status(400).json({ message: `${provider} integration is disabled` });
    }

    const event = await IntegrationEvent.create({
      provider,
      eventType: 'notification',
      payload: { title, message, channels },
      status: 'queued',
      requestedBy: req.user?._id || null,
    });

    const job = await enqueueJob({
      queue: 'integrations',
      type: `integration:${provider}:notification`,
      payload: {
        eventId: event._id,
        title,
        message,
        channels,
      },
    });

    return res.status(202).json({ message: 'Notification queued successfully', event, jobId: job._id });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error queueing notification', error: error.message });
  }
};

export const triggerAccountingExport = async (req, res) => {
  try {
    const { month, year, format = 'csv' } = req.body;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    const event = await IntegrationEvent.create({
      provider: 'accounting',
      eventType: 'payroll-export',
      payload: { month: Number(month), year: Number(year), format },
      status: 'queued',
      requestedBy: req.user?._id || null,
    });

    const job = await enqueueJob({
      queue: 'integrations',
      type: 'integration:accounting:export',
      payload: {
        eventId: event._id,
        month: Number(month),
        year: Number(year),
        format,
      },
    });

    return res.status(202).json({ message: 'Accounting export queued successfully', event, jobId: job._id });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error queueing accounting export', error: error.message });
  }
};

export const ingestBiometricEvent = async (req, res) => {
  try {
    const payload = req.body;
    const event = await IntegrationEvent.create({
      provider: 'biometric',
      eventType: 'attendance-device-event',
      payload,
      status: 'queued',
      requestedBy: req.user?._id || null,
    });

    const job = await enqueueJob({
      queue: 'integrations',
      type: 'integration:biometric:ingest',
      payload: {
        eventId: event._id,
        payload,
      },
    });

    return res.status(202).json({ message: 'Biometric event queued successfully', event, jobId: job._id });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error queueing biometric event', error: error.message });
  }
};

export const ingestCalendarEvent = async (req, res) => {
  try {
    const payload = req.body;
    const event = await IntegrationEvent.create({
      provider: 'calendar',
      eventType: 'calendar-event-sync',
      payload,
      status: 'queued',
      requestedBy: req.user?._id || null,
    });

    const job = await enqueueJob({
      queue: 'integrations',
      type: 'integration:calendar:ingest',
      payload: {
        eventId: event._id,
        payload,
      },
    });

    return res.status(202).json({ message: 'Calendar event queued successfully', event, jobId: job._id });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error queueing calendar event', error: error.message });
  }
};

export const listIntegrationEvents = async (req, res) => {
  try {
    const { provider, status } = req.query;
    const filters = {};
    if (provider) filters.provider = provider;
    if (status) filters.status = status;

    const events = await IntegrationEvent.find(filters).sort({ createdAt: -1 }).limit(200);

    return res.status(200).json({ message: 'Integration events fetched successfully', events });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching integration events', error: error.message });
  }
};

export const getIntegrationHealth = async (req, res) => {
  try {
    const [configs, events] = await Promise.all([
      IntegrationConfig.find().lean(),
      IntegrationEvent.find().sort({ createdAt: -1 }).limit(500).lean(),
    ]);

    const byProvider = {};
    events.forEach((event) => {
      if (!byProvider[event.provider]) {
        byProvider[event.provider] = { queued: 0, processed: 0, failed: 0, lastEventAt: null };
      }
      byProvider[event.provider][event.status] += 1;
      if (!byProvider[event.provider].lastEventAt) {
        byProvider[event.provider].lastEventAt = event.createdAt;
      }
    });

    const providers = ['slack', 'teams', 'accounting', 'biometric', 'calendar'].map((provider) => {
      const config = configs.find((item) => item.provider === provider);
      const stats = byProvider[provider] || { queued: 0, processed: 0, failed: 0, lastEventAt: null };
      return {
        provider,
        enabled: Boolean(config?.enabled),
        queued: stats.queued,
        processed: stats.processed,
        failed: stats.failed,
        lastEventAt: stats.lastEventAt,
      };
    });

    return res.status(200).json({ message: 'Integration health fetched successfully', providers });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching integration health', error: error.message });
  }
};

export const retryIntegrationEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await IntegrationEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Integration event not found' });
    }

    const jobType = resolveJobType(event.provider, event.eventType);
    if (!jobType) {
      return res.status(400).json({ message: 'Unsupported integration event type for retry' });
    }

    const config = await resolveProviderConfig(event.provider);
    if (!config.enabled) {
      return res.status(400).json({ message: `${event.provider} integration is disabled` });
    }

    const payload = { eventId: event._id, ...(event.payload || {}) };
    const job = await enqueueJob({
      queue: 'integrations',
      type: jobType,
      payload,
    });

    event.status = 'queued';
    event.error = '';
    await event.save();

    return res.status(202).json({ message: 'Integration event retry queued', jobId: job._id, event });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrying integration event', error: error.message });
  }
};
