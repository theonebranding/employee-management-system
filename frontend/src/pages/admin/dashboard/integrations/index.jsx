import { Loader2, RefreshCw, Send, Settings2, Workflow } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const defaultProviders = ['slack', 'teams', 'accounting', 'biometric', 'calendar'];

const AdminIntegrations = () => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem('token');

  const [configs, setConfigs] = useState([]);
  const [health, setHealth] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configsRes, healthRes, eventsRes] = await Promise.all([
        fetch(`${BASE_URL}/integrations/configs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/integrations/health`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/integrations/events`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [configsData, healthData, eventsData] = await Promise.all([
        configsRes.json(),
        healthRes.json(),
        eventsRes.json(),
      ]);

      if (!configsRes.ok) throw new Error(configsData.message || 'Failed to fetch configs');
      if (!healthRes.ok) throw new Error(healthData.message || 'Failed to fetch health');
      if (!eventsRes.ok) throw new Error(eventsData.message || 'Failed to fetch events');

      setConfigs(configsData.configs || []);
      setHealth(healthData.providers || []);
      setEvents(eventsData.events || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch integration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsertConfig = async (provider, enabled) => {
    try {
      const existing = configs.find(item => item.provider === provider);
      const response = await fetch(`${BASE_URL}/integrations/configs/${provider}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled, settings: existing?.settings || {} }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update config');
      toast.success('Integration config updated');
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to update integration config');
    }
  };

  const retryEvent = async eventId => {
    try {
      const response = await fetch(`${BASE_URL}/integrations/events/${eventId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to retry event');
      toast.success(data.message || 'Retry queued');
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to retry integration event');
    }
  };

  const sendSlackTest = async provider => {
    try {
      const response = await fetch(`${BASE_URL}/integrations/notify/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Integration Health Check',
          message: `Automated test message from ${provider} integration panel`,
          channels: ['general'],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to queue notification');
      toast.success(`Notification queued for ${provider}`);
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to send test notification');
    }
  };

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Integrations"
          icon={<Workflow className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Provider configuration, queue health, and retry controls."
        />

        {loading ? (
          <div className="rounded-xl p-8 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border inline-flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading integration telemetry...
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border p-4 overflow-auto">
              <h3 className="text-lg font-semibold mb-3">Provider Config</h3>
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="text-left border-b border-light-border dark:border-dark-border">
                    <th className="py-2 pr-2">Provider</th>
                    <th className="py-2 pr-2">Enabled</th>
                    <th className="py-2 pr-2">Queued</th>
                    <th className="py-2 pr-2">Failed</th>
                    <th className="py-2 pr-2">Last Event</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultProviders.map(provider => {
                    const config = configs.find(item => item.provider === provider);
                    const metric = health.find(item => item.provider === provider);
                    const enabled = Boolean(config?.enabled);
                    return (
                      <tr key={provider} className="border-b border-light-border/40 dark:border-dark-border/40">
                        <td className="py-2 pr-2 capitalize">{provider}</td>
                        <td className="py-2 pr-2">{enabled ? 'Enabled' : 'Disabled'}</td>
                        <td className="py-2 pr-2">{metric?.queued || 0}</td>
                        <td className="py-2 pr-2">{metric?.failed || 0}</td>
                        <td className="py-2 pr-2">{metric?.lastEventAt ? new Date(metric.lastEventAt).toLocaleString() : 'Never'}</td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => upsertConfig(provider, !enabled)}
                              className={`px-2 py-1 rounded ${enabled ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}
                            >
                              <Settings2 className="w-3 h-3 inline mr-1" />
                              {enabled ? 'Disable' : 'Enable'}
                            </button>
                            {(provider === 'slack' || provider === 'teams') && enabled ? (
                              <button
                                onClick={() => sendSlackTest(provider)}
                                className="px-2 py-1 rounded bg-info/15 text-info"
                              >
                                <Send className="w-3 h-3 inline mr-1" /> Test
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border p-4 overflow-auto">
              <h3 className="text-lg font-semibold mb-3">Recent Integration Events</h3>
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="text-left border-b border-light-border dark:border-dark-border">
                    <th className="py-2 pr-2">Time</th>
                    <th className="py-2 pr-2">Provider</th>
                    <th className="py-2 pr-2">Event</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Error</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event._id} className="border-b border-light-border/40 dark:border-dark-border/40">
                      <td className="py-2 pr-2 text-sm">{new Date(event.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-2 capitalize">{event.provider}</td>
                      <td className="py-2 pr-2">{event.eventType}</td>
                      <td className="py-2 pr-2">{event.status}</td>
                      <td className="py-2 pr-2 text-danger text-sm">{event.error || '-'}</td>
                      <td className="py-2 pr-2">
                        {event.status === 'failed' ? (
                          <button
                            onClick={() => retryEvent(event._id)}
                            className="px-2 py-1 rounded bg-primary/15 text-primary"
                          >
                            <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminIntegrations;
