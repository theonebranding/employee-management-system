import { Activity, History, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const AdminSecurityCenter = () => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem('token');
  const [activeTab, setActiveTab] = useState('audit');
  const [auditLogs, setAuditLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAuditLogs = async () => {
    const response = await fetch(`${BASE_URL}/audit-logs?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch audit logs');
    }
    setAuditLogs(data.logs || []);
  };

  const fetchSessions = async () => {
    const response = await fetch(`${BASE_URL}/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch sessions');
    }
    setSessions(data.sessions || []);
  };

  const revokeSession = async sessionId => {
    try {
      const response = await fetch(`${BASE_URL}/sessions/my/${sessionId}/revoke`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to revoke session');
      }
      toast.success(data.message || 'Session revoked');
      await fetchSessions();
    } catch (error) {
      toast.error(error.message || 'Failed to revoke session');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchAuditLogs(), fetchSessions()]);
    } catch (error) {
      toast.error(error.message || 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Security Center"
          icon={<ShieldCheck className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Audit trail and active session controls."
        />

        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'audit' ? 'bg-primary text-white' : ''}`}
          >
            <span className="inline-flex items-center gap-2">
              <History className="w-4 h-4" /> Audit Logs
            </span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'sessions' ? 'bg-primary text-white' : ''}`}
          >
            <span className="inline-flex items-center gap-2">
              <Activity className="w-4 h-4" /> Sessions
            </span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 rounded-xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
            Loading security data...
          </div>
        ) : activeTab === 'audit' ? (
          <div className="overflow-auto rounded-xl ring-1 ring-light-border dark:ring-dark-border bg-light-card dark:bg-dark-card">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-light-border dark:border-dark-border text-left">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Path</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log._id} className="border-b border-light-border/40 dark:border-dark-border/40">
                    <td className="px-4 py-3 text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{log.actorEmail || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{log.action}</td>
                    <td className="px-4 py-3 text-sm">{log.resource}</td>
                    <td className="px-4 py-3 text-sm">{log.statusCode}</td>
                    <td className="px-4 py-3 text-xs opacity-70">{log.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-auto rounded-xl ring-1 ring-light-border dark:ring-dark-border bg-light-card dark:bg-dark-card">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-light-border dark:border-dark-border text-left">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Last Seen</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr
                    key={session._id}
                    className="border-b border-light-border/40 dark:border-dark-border/40"
                  >
                    <td className="px-4 py-3 text-sm">{session.email}</td>
                    <td className="px-4 py-3 text-sm">{session.roleTemplate || session.role}</td>
                    <td className="px-4 py-3 text-sm">{session.deviceLabel || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm">{new Date(session.lastSeenAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{session.isActive ? 'Active' : 'Revoked'}</td>
                    <td className="px-4 py-3 text-sm">
                      {session.isActive ? (
                        <button
                          onClick={() => revokeSession(session._id)}
                          className="px-2 py-1 rounded bg-danger/15 text-danger"
                        >
                          Revoke
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
        )}
      </div>
    </div>
  );
};

export default AdminSecurityCenter;
