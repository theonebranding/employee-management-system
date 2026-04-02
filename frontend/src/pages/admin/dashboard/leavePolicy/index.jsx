import {
  CalendarClock,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import StatusBadge from '../../../../components/ui/statusBadge';
import SurfaceCard from '../../../../components/ui/surfaceCard';

const defaultLeaveType = {
  code: '',
  name: '',
  monthlyAccrual: 1.5,
  maxBalance: 30,
  carryForwardLimit: 10,
  sandwichRuleEnabled: false,
  encashmentEnabled: false,
  paid: true,
};

const defaultAdjustForm = {
  employeeId: '',
  leaveTypeCode: '',
  year: new Date().getFullYear(),
  adjustment: 0,
  note: '',
};

const AdminLeavePolicy = () => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [encashments, setEncashments] = useState([]);
  const [newLeaveType, setNewLeaveType] = useState(defaultLeaveType);
  const [adjustForm, setAdjustForm] = useState(defaultAdjustForm);
  const [editingTypeCode, setEditingTypeCode] = useState('');
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [runningJob, setRunningJob] = useState('');
  const [carryForwardYear, setCarryForwardYear] = useState(new Date().getFullYear() - 1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typeRes, balanceRes, encashRes] = await Promise.all([
        fetch(`${BASE_URL}/leave-policy/types`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/leave-policy/balances`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/leave-policy/encashments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [typeData, balanceData, encashData] = await Promise.all([
        typeRes.json(),
        balanceRes.json(),
        encashRes.json(),
      ]);

      if (!typeRes.ok) throw new Error(typeData.message || 'Failed to fetch leave types');
      if (!balanceRes.ok) throw new Error(balanceData.message || 'Failed to fetch balances');
      if (!encashRes.ok) throw new Error(encashData.message || 'Failed to fetch encashments');

      setLeaveTypes(typeData.leaveTypes || []);
      setBalances(balanceData.balances || []);
      setEncashments(encashData.requests || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load leave policy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createLeaveType = async e => {
    e.preventDefault();
    try {
      setCreating(true);
      const response = await fetch(`${BASE_URL}/leave-policy/types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newLeaveType),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create leave type');

      toast.success(data.message || 'Leave type created');
      setNewLeaveType(defaultLeaveType);
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to create leave type');
    } finally {
      setCreating(false);
    }
  };

  const beginEditLeaveType = type => {
    setEditingTypeCode(type.code);
    setEditingLeaveType({
      name: type.name,
      monthlyAccrual: type.monthlyAccrual,
      maxBalance: type.maxBalance,
      carryForwardLimit: type.carryForwardLimit,
      sandwichRuleEnabled: type.sandwichRuleEnabled,
      encashmentEnabled: type.encashmentEnabled,
      paid: type.paid,
      isActive: type.isActive,
    });
  };

  const saveLeaveType = async () => {
    if (!editingTypeCode || !editingLeaveType) return;
    try {
      const response = await fetch(`${BASE_URL}/leave-policy/types/${editingTypeCode}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingLeaveType),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update leave type');

      toast.success('Leave type updated');
      setEditingTypeCode('');
      setEditingLeaveType(null);
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to update leave type');
    }
  };

  const submitBalanceAdjustment = async e => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/leave-policy/balances/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...adjustForm,
          year: Number(adjustForm.year),
          adjustment: Number(adjustForm.adjustment),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to adjust leave balance');

      toast.success(data.message || 'Leave balance adjusted');
      setAdjustForm(defaultAdjustForm);
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to adjust leave balance');
    }
  };

  const triggerAccrual = async endpoint => {
    const now = new Date();
    try {
      setRunningJob(endpoint);
      const response = await fetch(`${BASE_URL}/leave-policy/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ month: now.getMonth() + 1, year: now.getFullYear() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to trigger accrual run');
      toast.success(data.message || 'Accrual run triggered');
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to trigger accrual run');
    } finally {
      setRunningJob('');
    }
  };

  const triggerCarryForward = async endpoint => {
    try {
      setRunningJob(endpoint);
      const response = await fetch(`${BASE_URL}/leave-policy/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sourceYear: Number(carryForwardYear) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to trigger carry-forward');
      toast.success(data.message || 'Carry-forward triggered');
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to trigger carry-forward');
    } finally {
      setRunningJob('');
    }
  };

  const decideEncashment = async (requestId, decision) => {
    try {
      const response = await fetch(`${BASE_URL}/leave-policy/encashments/${requestId}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to apply decision');
      toast.success(data.message || 'Encashment updated');
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to update encashment');
    }
  };

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Leave Policy Engine"
          icon={<SlidersHorizontal className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Configure leave types, balances, encashment, and year-end carry-forward."
        />

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={fetchData}
            className="px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => triggerAccrual('accrual/queue')}
            className="px-3 py-2 rounded-lg bg-primary text-white inline-flex items-center gap-2"
          >
            <CalendarClock className="w-4 h-4" /> Queue Monthly Accrual
          </button>
          <button
            onClick={() => triggerAccrual('accrual/run-now')}
            className="px-3 py-2 rounded-lg bg-info text-white inline-flex items-center gap-2"
          >
            {runningJob === 'accrual/run-now' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Run Accrual Now
          </button>
          <input
            type="number"
            className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card w-32"
            value={carryForwardYear}
            onChange={e => setCarryForwardYear(e.target.value)}
          />
          <button
            onClick={() => triggerCarryForward('carry-forward/queue')}
            className="px-3 py-2 rounded-lg bg-secondary text-white inline-flex items-center gap-2"
          >
            Queue Carry Forward
          </button>
          <button
            onClick={() => triggerCarryForward('carry-forward/run-now')}
            className="px-3 py-2 rounded-lg bg-warning text-black inline-flex items-center gap-2"
          >
            {runningJob === 'carry-forward/run-now' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Run Carry Forward Now
          </button>
        </div>

        <SurfaceCard
          as="form"
          onSubmit={createLeaveType}
          className="rounded-xl p-4 space-y-3"
        >
          <h3 className="text-lg font-semibold">Create Leave Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={newLeaveType.code}
              onChange={e => setNewLeaveType(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Code (e.g. ANNUAL)"
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
            <input
              value={newLeaveType.name}
              onChange={e => setNewLeaveType(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
            <input
              type="number"
              step="0.5"
              value={newLeaveType.monthlyAccrual}
              onChange={e => setNewLeaveType(prev => ({ ...prev, monthlyAccrual: Number(e.target.value) }))}
              placeholder="Monthly accrual"
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="number"
              value={newLeaveType.maxBalance}
              onChange={e => setNewLeaveType(prev => ({ ...prev, maxBalance: Number(e.target.value) }))}
              placeholder="Max balance"
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
            <input
              type="number"
              value={newLeaveType.carryForwardLimit}
              onChange={e =>
                setNewLeaveType(prev => ({ ...prev, carryForwardLimit: Number(e.target.value) }))
              }
              placeholder="Carry-forward"
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newLeaveType.paid}
                onChange={e => setNewLeaveType(prev => ({ ...prev, paid: e.target.checked }))}
              />
              Paid leave
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newLeaveType.sandwichRuleEnabled}
                onChange={e =>
                  setNewLeaveType(prev => ({ ...prev, sandwichRuleEnabled: e.target.checked }))
                }
              />
              Sandwich rule
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newLeaveType.encashmentEnabled}
                onChange={e =>
                  setNewLeaveType(prev => ({ ...prev, encashmentEnabled: e.target.checked }))
                }
              />
              Encashment
            </label>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-3 py-2 rounded-lg bg-primary text-white inline-flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Leave Type
          </button>
        </SurfaceCard>

        <SurfaceCard className="rounded-xl p-4 overflow-auto">
          <h3 className="text-lg font-semibold mb-3">Leave Types</h3>
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="text-left border-b border-light-border dark:border-dark-border">
                <th className="py-2 pr-2">Code</th>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Accrual</th>
                <th className="py-2 pr-2">Max Balance</th>
                <th className="py-2 pr-2">Carry Forward</th>
                <th className="py-2 pr-2">Paid</th>
                <th className="py-2 pr-2">Sandwich</th>
                <th className="py-2 pr-2">Encashment</th>
                <th className="py-2 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : (
                leaveTypes.map(type => {
                  const isEditing = editingTypeCode === type.code;
                  const source = isEditing ? editingLeaveType : type;
                  return (
                    <tr key={type._id} className="border-b border-light-border/40 dark:border-dark-border/40">
                      <td className="py-2 pr-2">{type.code}</td>
                      <td className="py-2 pr-2">
                        {isEditing ? (
                          <input
                            value={source.name}
                            onChange={e =>
                              setEditingLeaveType(prev => ({ ...prev, name: e.target.value }))
                            }
                            className="px-2 py-1 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                          />
                        ) : (
                          source.name
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={source.monthlyAccrual}
                            onChange={e =>
                              setEditingLeaveType(prev => ({
                                ...prev,
                                monthlyAccrual: Number(e.target.value),
                              }))
                            }
                            className="w-20 px-2 py-1 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                          />
                        ) : (
                          source.monthlyAccrual
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {isEditing ? (
                          <input
                            type="number"
                            value={source.maxBalance}
                            onChange={e =>
                              setEditingLeaveType(prev => ({ ...prev, maxBalance: Number(e.target.value) }))
                            }
                            className="w-20 px-2 py-1 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                          />
                        ) : (
                          source.maxBalance
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {isEditing ? (
                          <input
                            type="number"
                            value={source.carryForwardLimit}
                            onChange={e =>
                              setEditingLeaveType(prev => ({
                                ...prev,
                                carryForwardLimit: Number(e.target.value),
                              }))
                            }
                            className="w-20 px-2 py-1 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
                          />
                        ) : (
                          source.carryForwardLimit
                        )}
                      </td>
                      <td className="py-2 pr-2">{source.paid ? 'Yes' : 'No'}</td>
                      <td className="py-2 pr-2">{source.sandwichRuleEnabled ? 'Yes' : 'No'}</td>
                      <td className="py-2 pr-2">{source.encashmentEnabled ? 'Yes' : 'No'}</td>
                      <td className="py-2 pr-2">
                        {isEditing ? (
                           <div className="flex flex-wrap gap-2">
                            <button
                              onClick={saveLeaveType}
                              className="px-2 py-1 rounded bg-success/15 text-success"
                            >
                              <Save className="w-3 h-3 inline mr-1" /> Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingTypeCode('');
                                setEditingLeaveType(null);
                              }}
                              className="px-2 py-1 rounded bg-danger/15 text-danger"
                            >
                              <X className="w-3 h-3 inline mr-1" /> Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => beginEditLeaveType(type)}
                            className="px-2 py-1 rounded bg-info/15 text-info"
                          >
                            <Pencil className="w-3 h-3 inline mr-1" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </SurfaceCard>

        <SurfaceCard
          as="form"
          onSubmit={submitBalanceAdjustment}
          className="rounded-xl p-4 space-y-3"
        >
          <h3 className="text-lg font-semibold">Adjust Leave Balance</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              placeholder="Employee ID"
              value={adjustForm.employeeId}
              onChange={e => setAdjustForm(prev => ({ ...prev, employeeId: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
            <input
              placeholder="Leave Type Code"
              value={adjustForm.leaveTypeCode}
              onChange={e => setAdjustForm(prev => ({ ...prev, leaveTypeCode: e.target.value.toUpperCase() }))}
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
            <input
              type="number"
              placeholder="Year"
              value={adjustForm.year}
              onChange={e => setAdjustForm(prev => ({ ...prev, year: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
            <input
              type="number"
              step="0.5"
              placeholder="Adjustment"
              value={adjustForm.adjustment}
              onChange={e => setAdjustForm(prev => ({ ...prev, adjustment: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
            <input
              placeholder="Note"
              value={adjustForm.note}
              onChange={e => setAdjustForm(prev => ({ ...prev, note: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg"
            />
          </div>
          <button type="submit" className="px-3 py-2 rounded-lg bg-primary text-white">
            Apply Adjustment
          </button>
        </SurfaceCard>

        <SurfaceCard className="rounded-xl p-4 overflow-auto">
          <h3 className="text-lg font-semibold mb-3">Leave Balances</h3>
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="text-left border-b border-light-border dark:border-dark-border">
                <th className="py-2 pr-2">Employee</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Year</th>
                <th className="py-2 pr-2">Opening</th>
                <th className="py-2 pr-2">Accrued</th>
                <th className="py-2 pr-2">Used</th>
                <th className="py-2 pr-2">Encashed</th>
                <th className="py-2 pr-2">Lapsed</th>
                <th className="py-2 pr-2">Adjustments</th>
                <th className="py-2 pr-2">Available</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : balances.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-4 text-center opacity-70">
                    No leave balances found
                  </td>
                </tr>
              ) : (
                balances.map(item => (
                  <tr key={item._id} className="border-b border-light-border/40 dark:border-dark-border/40">
                    <td className="py-2 pr-2">{item.employee?.email || item.employee?.name || '-'}</td>
                    <td className="py-2 pr-2">{item.leaveTypeCode}</td>
                    <td className="py-2 pr-2">{item.year}</td>
                    <td className="py-2 pr-2">{item.openingBalance}</td>
                    <td className="py-2 pr-2">{item.accrued}</td>
                    <td className="py-2 pr-2">{item.used}</td>
                    <td className="py-2 pr-2">{item.encashed}</td>
                    <td className="py-2 pr-2">{item.lapsed}</td>
                    <td className="py-2 pr-2">{item.adjustments}</td>
                    <td className="py-2 pr-2 font-semibold">{item.available}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SurfaceCard>

        <SurfaceCard className="rounded-xl p-4 overflow-auto">
          <h3 className="text-lg font-semibold mb-3">Leave Encashment Requests</h3>
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="text-left border-b border-light-border dark:border-dark-border">
                <th className="py-2 pr-2">Employee</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Year</th>
                <th className="py-2 pr-2">Requested Days</th>
                <th className="py-2 pr-2">Approved Days</th>
                <th className="py-2 pr-2">Amount</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {encashments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center opacity-70">
                    No encashment requests found
                  </td>
                </tr>
              ) : (
                encashments.map(item => (
                  <tr key={item._id} className="border-b border-light-border/40 dark:border-dark-border/40">
                    <td className="py-2 pr-2">{item.employee?.email || item.employee?.name || '-'}</td>
                    <td className="py-2 pr-2">{item.leaveTypeCode}</td>
                    <td className="py-2 pr-2">{item.year}</td>
                    <td className="py-2 pr-2">{item.daysRequested}</td>
                    <td className="py-2 pr-2">{item.daysApproved || '-'}</td>
                    <td className="py-2 pr-2">INR {item.amountTotal}</td>
                    <td className="py-2 pr-2">
                      <StatusBadge
                        label={item.status}
                        tone={
                          item.status === 'approved'
                            ? 'success'
                            : item.status === 'rejected'
                              ? 'danger'
                              : item.status === 'paid'
                                ? 'info'
                                : 'warning'
                        }
                        className="capitalize"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-2">
                        {item.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => decideEncashment(item._id, 'approved')}
                              className="px-2 py-1 rounded bg-success/15 text-success"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => decideEncashment(item._id, 'rejected')}
                              className="px-2 py-1 rounded bg-danger/15 text-danger"
                            >
                              Reject
                            </button>
                          </>
                        ) : item.status === 'approved' ? (
                          <button
                            onClick={() => decideEncashment(item._id, 'paid')}
                            className="px-2 py-1 rounded bg-info/15 text-info"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SurfaceCard>
      </div>
    </div>
  );
};

export default AdminLeavePolicy;
