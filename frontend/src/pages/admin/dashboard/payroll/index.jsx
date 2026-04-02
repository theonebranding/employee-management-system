import { AlertTriangle, CheckCircle2, Loader2, Lock, PlayCircle, Rocket, Shield } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const statusBadgeClass = {
  draft: 'bg-warning/15 text-warning ring-warning/30',
  validated: 'bg-info/15 text-info ring-info/30',
  locked: 'bg-accent/15 text-accent ring-accent/30',
  released: 'bg-success/15 text-success ring-success/30',
};

const AdminPayrollRuns = () => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const token = localStorage.getItem('token');

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/payroll/runs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch payroll runs');
      setRuns(data.runs || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch payroll runs');
    } finally {
      setLoading(false);
    }
  };

  const createRun = async e => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('Run name is required');
      return;
    }

    try {
      setActionLoadingId('create');
      const response = await fetch(`${BASE_URL}/payroll/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createForm.name,
          month: Number(createForm.month),
          year: Number(createForm.year),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create payroll run');
      toast.success(data.message || 'Payroll run created');
      setCreateForm(prev => ({ ...prev, name: '' }));
      await fetchRuns();
    } catch (error) {
      toast.error(error.message || 'Failed to create payroll run');
    } finally {
      setActionLoadingId('');
    }
  };

  const runAction = async (runId, action) => {
    try {
      setActionLoadingId(`${runId}:${action}`);
      const response = await fetch(`${BASE_URL}/payroll/runs/${runId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Failed to ${action} payroll run`);
      toast.success(data.message || `Payroll run ${action}d successfully`);
      await fetchRuns();
    } catch (error) {
      toast.error(error.message || `Failed to ${action} payroll run`);
    } finally {
      setActionLoadingId('');
    }
  };

  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    return runs.reduce(
      (acc, run) => {
        acc.headcount += Number(run?.totals?.headcount || 0);
        acc.net += Number(run?.totals?.net || 0);
        return acc;
      },
      { headcount: 0, net: 0 }
    );
  }, [runs]);

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Payroll Lifecycle"
          icon={<Shield className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Manage payroll runs through draft, validate, lock, and release states."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
            <p className="text-sm opacity-70">Total Runs</p>
            <p className="text-2xl font-semibold">{runs.length}</p>
          </div>
          <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
            <p className="text-sm opacity-70">Included Employees</p>
            <p className="text-2xl font-semibold">{totals.headcount}</p>
          </div>
          <div className="rounded-xl p-4 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
            <p className="text-sm opacity-70">Net Payout Total</p>
            <p className="text-2xl font-semibold">INR {totals.net.toLocaleString()}</p>
          </div>
        </div>

        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border rounded-xl p-4"
          onSubmit={createRun}
        >
          <input
            className="px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
            placeholder="Run name (e.g. Mar 2026 Core Payroll)"
            value={createForm.name}
            onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            max="12"
            className="px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
            value={createForm.month}
            onChange={e => setCreateForm(prev => ({ ...prev, month: e.target.value }))}
          />
          <input
            type="number"
            min="2000"
            max="2100"
            className="px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
            value={createForm.year}
            onChange={e => setCreateForm(prev => ({ ...prev, year: e.target.value }))}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white px-4 py-2"
            disabled={actionLoadingId === 'create'}
          >
            {actionLoadingId === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Create Run
          </button>
        </form>

        <div className="overflow-auto rounded-xl ring-1 ring-light-border dark:ring-dark-border bg-light-card dark:bg-dark-card">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="text-left border-b border-light-border dark:border-dark-border">
                <th className="px-4 py-3">Run</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Headcount</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Compliance</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center opacity-70">
                    Loading payroll runs...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center opacity-70">
                    No payroll runs found
                  </td>
                </tr>
              ) : (
                runs.map(run => {
                  const actionKey = action => `${run._id}:${action}`;
                  const isComplianceOk = run?.complianceSummary?.isCompliant;

                  return (
                    <tr key={run._id} className="border-b border-light-border/50 dark:border-dark-border/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{run.name}</p>
                        <p className="text-xs opacity-70">{run._id}</p>
                      </td>
                      <td className="px-4 py-3">
                        {String(run.month).padStart(2, '0')}/{run.year}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs rounded-full ring-1 ${statusBadgeClass[run.status] || statusBadgeClass.draft}`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{run?.totals?.headcount || 0}</td>
                      <td className="px-4 py-3">INR {(run?.totals?.net || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {isComplianceOk ? (
                          <span className="inline-flex items-center gap-1 text-success text-sm">
                            <CheckCircle2 className="w-4 h-4" /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-warning text-sm">
                            <AlertTriangle className="w-4 h-4" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded bg-info/15 text-info"
                            onClick={() => runAction(run._id, 'validate')}
                            disabled={actionLoadingId === actionKey('validate') || run.status === 'released'}
                          >
                            {actionLoadingId === actionKey('validate') ? '...' : 'Validate'}
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded bg-accent/15 text-accent inline-flex items-center gap-1"
                            onClick={() => runAction(run._id, 'lock')}
                            disabled={actionLoadingId === actionKey('lock') || run.status !== 'validated'}
                          >
                            <Lock className="w-3 h-3" /> {actionLoadingId === actionKey('lock') ? '...' : 'Lock'}
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded bg-success/15 text-success inline-flex items-center gap-1"
                            onClick={() => runAction(run._id, 'release')}
                            disabled={actionLoadingId === actionKey('release') || run.status !== 'locked'}
                          >
                            <Rocket className="w-3 h-3" /> {actionLoadingId === actionKey('release') ? '...' : 'Release'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPayrollRuns;
