import 'react-toastify/dist/ReactToastify.css';

import {
  BadgeCheck,
  Ban,
  Calendar,
  CalendarDays,
  Check,
  Clock,
  Coins,
  FileText,
  HandCoins,
  NotebookTabsIcon,
  Plus,
  SortAsc,
  Wallet,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import ModalShell from '../../../../components/ui/modalShell';
import StatusBadge from '../../../../components/ui/statusBadge';
import SurfaceCard from '../../../../components/ui/surfaceCard';
import { apiGet, apiPost } from '../../../../services/apiClient';

const currentYear = new Date().getFullYear();

const initialLeaveRequest = {
  startDate: '',
  endDate: '',
  reason: '',
  leaveTypeCode: '',
};

const initialEncashmentRequest = {
  leaveTypeCode: '',
  year: currentYear,
  daysRequested: '',
  note: '',
};

const Leaves = () => {
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isEncashmentModalOpen, setIsEncashmentModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState(initialLeaveRequest);
  const [encashmentForm, setEncashmentForm] = useState(initialEncashmentRequest);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [encashmentRequests, setEncashmentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [submittingEncashment, setSubmittingEncashment] = useState(false);
  const [leavePreviewLoading, setLeavePreviewLoading] = useState(false);
  const [encashmentQuoteLoading, setEncashmentQuoteLoading] = useState(false);
  const [leavePreview, setLeavePreview] = useState(null);
  const [encashmentQuote, setEncashmentQuote] = useState(null);
  const [sortOption, setSortOption] = useState('latest');

  const getDefaultLeaveTypeCode = (types, preferEncashment = false) => {
    const activeTypes = (types || []).filter(type => type.isActive !== false);
    if (activeTypes.length === 0) return 'ANNUAL';

    if (preferEncashment) {
      const encashmentType = activeTypes.find(type => type.encashmentEnabled);
      if (encashmentType?.code) return encashmentType.code;
    }

    return activeTypes[0]?.code || 'ANNUAL';
  };

  const fetchAllData = async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      apiGet('/leaves/employee-leaves'),
      apiGet('/leave-policy/types'),
      apiGet('/leave-policy/balances'),
      apiGet('/leave-policy/encashments'),
    ]);

    const [leavesResult, leaveTypesResult, balancesResult, encashmentsResult] = results;

    if (leavesResult.status === 'fulfilled') {
      setLeaveRequests(leavesResult.value.leaves || []);
    } else {
      toast.error(leavesResult.reason?.message || 'Failed to fetch leaves');
    }

    if (leaveTypesResult.status === 'fulfilled') {
      const fetchedTypes = leaveTypesResult.value.leaveTypes || [];
      setLeaveTypes(fetchedTypes);

      setNewRequest(prev => ({
        ...prev,
        leaveTypeCode: prev.leaveTypeCode || getDefaultLeaveTypeCode(fetchedTypes),
      }));

      setEncashmentForm(prev => ({
        ...prev,
        leaveTypeCode: prev.leaveTypeCode || getDefaultLeaveTypeCode(fetchedTypes, true),
      }));
    } else {
      toast.error(leaveTypesResult.reason?.message || 'Failed to fetch leave types');
    }

    if (balancesResult.status === 'fulfilled') {
      setLeaveBalances(balancesResult.value.balances || []);
    } else {
      toast.error(balancesResult.reason?.message || 'Failed to fetch leave balances');
    }

    if (encashmentsResult.status === 'fulfilled') {
      setEncashmentRequests(encashmentsResult.value.requests || []);
    } else {
      toast.error(encashmentsResult.reason?.message || 'Failed to fetch encashment requests');
    }

    setLeavePreview(null);
    setEncashmentQuote(null);

    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveTypeNameByCode = useMemo(() => {
    const map = new Map();
    leaveTypes.forEach(type => {
      map.set(type.code, type.name);
    });
    return map;
  }, [leaveTypes]);

  const encashmentEligibleTypes = useMemo(
    () => leaveTypes.filter(type => type.isActive !== false && type.encashmentEnabled),
    [leaveTypes]
  );

  useEffect(() => {
    if (!isLeaveModalOpen) return;
    if (!newRequest.leaveTypeCode || !newRequest.startDate || !newRequest.endDate) {
      setLeavePreview(null);
      return;
    }

    let cancelled = false;
    setLeavePreviewLoading(true);

    apiGet('/leave-policy/preview', {
      leaveTypeCode: newRequest.leaveTypeCode,
      startDate: newRequest.startDate,
      endDate: newRequest.endDate,
    })
      .then(data => {
        if (cancelled) return null;
        setLeavePreview(data.preview || null);
        return data;
      })
      .catch(() => {
        if (!cancelled) setLeavePreview(null);
      })
      .finally(() => {
        if (!cancelled) setLeavePreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLeaveModalOpen, newRequest.leaveTypeCode, newRequest.startDate, newRequest.endDate]);

  useEffect(() => {
    if (!isEncashmentModalOpen) return;
    if (!encashmentForm.leaveTypeCode || !encashmentForm.year || !encashmentForm.daysRequested) {
      setEncashmentQuote(null);
      return;
    }

    const days = Number(encashmentForm.daysRequested);
    const year = Number(encashmentForm.year);
    if (Number.isNaN(days) || days <= 0 || Number.isNaN(year)) {
      setEncashmentQuote(null);
      return;
    }

    let cancelled = false;
    setEncashmentQuoteLoading(true);

    apiGet('/leave-policy/encashments/quote', {
      leaveTypeCode: encashmentForm.leaveTypeCode,
      year,
      daysRequested: days,
    })
      .then(data => {
        if (cancelled) return null;
        setEncashmentQuote(data.quote || null);
        return data;
      })
      .catch(() => {
        if (!cancelled) setEncashmentQuote(null);
      })
      .finally(() => {
        if (!cancelled) setEncashmentQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isEncashmentModalOpen,
    encashmentForm.leaveTypeCode,
    encashmentForm.year,
    encashmentForm.daysRequested,
  ]);

  const sortedRequests = useMemo(() => {
    return [...leaveRequests].sort((a, b) => {
      if (sortOption === 'latest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortOption === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortOption === 'approved') {
        const aApproved = a.status?.toLowerCase() === 'approved';
        const bApproved = b.status?.toLowerCase() === 'approved';
        if (aApproved && !bApproved) return -1;
        if (!aApproved && bApproved) return 1;
      }
      return 0;
    });
  }, [leaveRequests, sortOption]);

  const isLeaveSubmitBlocked =
    submittingLeave ||
    leavePreviewLoading ||
    (leavePreview?.overlapConflict === true) ||
    (leavePreview?.balanceCheck && leavePreview.balanceCheck.sufficient === false);

  const isEncashmentSubmitBlocked =
    submittingEncashment ||
    encashmentQuoteLoading ||
    (encashmentForm.daysRequested !== '' && !encashmentQuote);

  const getStatusConfig = status => {
    const safeStatus = (status || 'pending').toLowerCase();
    const configs = {
      approved: {
        tone: 'success',
        icon: <Check className="w-4 h-4" />,
      },
      rejected: {
        tone: 'danger',
        icon: <X className="w-4 h-4" />,
      },
      pending: {
        tone: 'warning',
        icon: <Clock className="w-4 h-4" />,
      },
      paid: {
        tone: 'info',
        icon: <Coins className="w-4 h-4" />,
      },
    };
    return configs[safeStatus] || configs.pending;
  };

  const handleNewRequest = async e => {
    e.preventDefault();
    try {
      setSubmittingLeave(true);
      const data = await apiPost('/leaves/create', {
        ...newRequest,
        leaveTypeCode: newRequest.leaveTypeCode || getDefaultLeaveTypeCode(leaveTypes),
      });

      toast.success(data.message || 'Leave request created successfully');
      setIsLeaveModalOpen(false);
      setNewRequest(prev => ({
        ...initialLeaveRequest,
        leaveTypeCode: prev.leaveTypeCode || getDefaultLeaveTypeCode(leaveTypes),
      }));
      await fetchAllData();
    } catch (error) {
      toast.error(error.message || 'Failed to create leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleEncashmentRequest = async e => {
    e.preventDefault();
    try {
      setSubmittingEncashment(true);
      const payload = {
        leaveTypeCode: encashmentForm.leaveTypeCode,
        year: Number(encashmentForm.year),
        daysRequested: Number(encashmentForm.daysRequested),
        note: encashmentForm.note?.trim() || undefined,
      };

      const data = await apiPost('/leave-policy/encashments', payload);

      toast.success(data.message || 'Encashment request submitted');
      setIsEncashmentModalOpen(false);
      setEncashmentForm(prev => ({
        ...initialEncashmentRequest,
        leaveTypeCode: prev.leaveTypeCode || getDefaultLeaveTypeCode(leaveTypes, true),
      }));
      await fetchAllData();
    } catch (error) {
      toast.error(error.message || 'Failed to submit encashment request');
    } finally {
      setSubmittingEncashment(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <SurfaceCard className={`rounded-xl transform hover:scale-105 transition-all ${colorClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-light-text dark:text-dark-text text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 text-light-text dark:text-dark-text">{value}</p>
        </div>
        <div className="p-3 rounded-lg bg-light-bg dark:bg-dark-bg">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </SurfaceCard>
  );

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Leave Requests"
          description="Manage leave applications, balances, and encashment requests."
          icon={<NotebookTabsIcon className="w-8 h-8 text-light-text dark:text-dark-text" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Approved Leaves"
            value={leaveRequests.filter(req => req.status?.toLowerCase() === 'approved').length}
            icon={BadgeCheck}
            colorClass="bg-success/10 text-success ring-success/30"
          />
          <StatCard
            title="Pending Leaves"
            value={leaveRequests.filter(req => req.status?.toLowerCase() === 'pending').length}
            icon={Clock}
            colorClass="bg-warning/10 text-warning ring-warning/30"
          />
          <StatCard
            title="Rejected Leaves"
            value={leaveRequests.filter(req => req.status?.toLowerCase() === 'rejected').length}
            icon={Ban}
            colorClass="bg-danger/10 text-danger ring-danger/30"
          />
        </div>

        <SurfaceCard>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Leave Balances</h2>
          </div>

          {leaveBalances.length === 0 ? (
            <p className="text-sm text-light-text dark:text-dark-text opacity-70">
              No leave balances available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {leaveBalances.map(balance => (
                <div
                  key={balance._id}
                  className="rounded-xl p-4 bg-light-bg dark:bg-dark-bg ring-1 ring-light-border dark:ring-dark-border"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-light-text dark:text-dark-text">
                      {leaveTypeNameByCode.get(balance.leaveTypeCode) || balance.leaveTypeCode}
                    </p>
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      {balance.year}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-light-text dark:text-dark-text">
                    {Number(balance.available || 0).toFixed(1)}
                  </p>
                  <p className="text-xs text-light-text dark:text-dark-text opacity-70">Available days</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-light-text dark:text-dark-text opacity-80">
                    <span>Used: {Number(balance.used || 0).toFixed(1)}</span>
                    <span>Accrued: {Number(balance.accrued || 0).toFixed(1)}</span>
                    <span>Encashed: {Number(balance.encashed || 0).toFixed(1)}</span>
                    <span>Adjusted: {Number(balance.adjustments || 0).toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4 sm:gap-8 mb-4">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 transition-all transform hover:scale-105 focus:ring-2 focus:ring-primary-light focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            New Leave Request
          </button>

          <button
            onClick={() => setIsEncashmentModalOpen(true)}
            disabled={encashmentEligibleTypes.length === 0}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
              encashmentEligibleTypes.length === 0
                ? 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text opacity-60 cursor-not-allowed'
                : 'bg-info hover:bg-info/90 text-white'
            }`}
          >
            <HandCoins className="w-4 h-4" />
            Request Encashment
          </button>

          <div className="relative">
            <SortAsc className="absolute left-3 top-2.5 h-5 w-5 text-light-text dark:text-dark-text opacity-70" />
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="pl-9 pr-4 py-2 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-sm text-light-text dark:text-dark-text"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="approved">Approved first</option>
            </select>
          </div>
        </div>

        <SurfaceCard>
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">Recent Requests</h2>

          {loading ? (
            <p className="text-sm text-light-text dark:text-dark-text opacity-70">Loading requests...</p>
          ) : sortedRequests.length === 0 ? (
            <p className="text-sm text-light-text dark:text-dark-text opacity-70">
              No leave requests found.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedRequests.map(request => {
                const statusConfig = getStatusConfig(request.status);
                return (
                  <div
                    key={request._id}
                    className="bg-light-bg dark:bg-dark-bg rounded-xl p-6 ring-1 ring-light-border dark:ring-dark-border hover:bg-light-card dark:hover:bg-dark-card transition-all"
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-grow space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge
                            tone={statusConfig.tone}
                            icon={statusConfig.icon}
                            label={request.status}
                            className="capitalize"
                          />
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
                            <span>{leaveTypeNameByCode.get(request.leaveTypeCode) || request.leaveTypeCode}</span>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border">
                            <span>{Number(request.numberOfDays || 0).toFixed(1)} day(s)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-light-text dark:text-dark-text">
                          <FileText className="w-4 h-4" />
                          <span>{request.reason}</span>
                        </div>
                        <div className="flex items-center gap-2 text-light-text dark:text-dark-text opacity-70 text-sm">
                          <CalendarDays className="w-4 h-4" />
                          <span>
                            {new Date(request.startDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            -{' '}
                            {new Date(request.endDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-light-text dark:text-dark-text opacity-70">
                        <Calendar className="w-4 h-4 mr-2" />
                        Submitted on {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">
            Encashment History
          </h2>

          {encashmentRequests.length === 0 ? (
            <p className="text-sm text-light-text dark:text-dark-text opacity-70">
              No encashment requests submitted.
            </p>
          ) : (
            <div className="space-y-3">
              {encashmentRequests.map(item => {
                const statusConfig = getStatusConfig(item.status);
                return (
                  <div
                    key={item._id}
                    className="rounded-xl p-4 bg-light-bg dark:bg-dark-bg ring-1 ring-light-border dark:ring-dark-border"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge
                          tone={statusConfig.tone}
                          icon={statusConfig.icon}
                          label={item.status}
                          className="capitalize"
                        />
                        <span className="text-sm text-light-text dark:text-dark-text">
                          {leaveTypeNameByCode.get(item.leaveTypeCode) || item.leaveTypeCode}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border">
                          {item.year}
                        </span>
                      </div>
                      <div className="text-sm text-light-text dark:text-dark-text opacity-75">
                        Requested {Number(item.daysRequested || 0).toFixed(1)} day(s)
                        {item.daysApproved ? ` • Approved ${Number(item.daysApproved).toFixed(1)} day(s)` : ''}
                        {Number(item.amountTotal || 0) > 0
                          ? ` • Amount INR ${Number(item.amountTotal).toFixed(2)}`
                          : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </div>

      {isLeaveModalOpen && (
        <ModalShell>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-2 rounded-lg">
                <CalendarDays className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">New Leave Request</h2>
            </div>

            <form onSubmit={handleNewRequest} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                  Leave Type
                </label>
                <select
                  value={newRequest.leaveTypeCode}
                  onChange={e => setNewRequest(prev => ({ ...prev, leaveTypeCode: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                  required
                >
                  {leaveTypes
                    .filter(type => type.isActive !== false)
                    .map(type => (
                      <option key={type.code} value={type.code}>
                        {type.name} ({type.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newRequest.startDate}
                  onChange={e => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                  End Date
                </label>
                <input
                  type="date"
                  value={newRequest.endDate}
                  onChange={e => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                  Reason
                </label>
                <textarea
                  value={newRequest.reason}
                  onChange={e => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text h-32 resize-none"
                  placeholder="Please provide a detailed reason for your leave request..."
                  required
                />
              </div>

              <div className="rounded-lg p-3 bg-light-bg dark:bg-dark-bg ring-1 ring-light-border dark:ring-dark-border text-sm text-light-text dark:text-dark-text">
                {leavePreviewLoading ? (
                  <p className="opacity-75">Calculating leave policy preview...</p>
                ) : leavePreview ? (
                  <div className="space-y-1">
                    <p>
                      Effective days: <strong>{Number(leavePreview.numberOfDays || 0).toFixed(1)}</strong>
                    </p>
                    <p>
                      Holidays/weekends inside range: <strong>{leavePreview.holidayCount || 0}</strong>
                      {Number(leavePreview.sandwichDays || 0) > 0
                        ? ` • Sandwich days counted: ${leavePreview.sandwichDays}`
                        : ''}
                    </p>
                    {leavePreview.balance && (
                      <p>
                        Available balance: <strong>{Number(leavePreview.balance.available || 0).toFixed(1)}</strong>
                        {leavePreview.balanceCheck?.sufficient ? '' : ' • Insufficient for this request'}
                      </p>
                    )}
                    {leavePreview.requiresDocument && (
                      <p className="text-warning">
                        Supporting document is required for requests above{' '}
                        {leavePreview.requiresDocumentAfterDays} day(s).
                      </p>
                    )}
                    {leavePreview.overlapConflict && (
                      <p className="text-danger">{leavePreview.overlapMessage}</p>
                    )}
                  </div>
                ) : (
                  <p className="opacity-75">Select leave type and date range to preview policy impact.</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLeaveSubmitBlocked}
                  className="w-full sm:flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="w-full sm:flex-1 px-4 py-2.5 bg-light-bg dark:bg-dark-bg hover:bg-light-card dark:hover:bg-dark-card text-light-text dark:text-dark-text rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
        </ModalShell>
      )}

      {isEncashmentModalOpen && (
        <ModalShell>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-info/10 p-2 rounded-lg">
                <HandCoins className="w-6 h-6 text-info" />
              </div>
              <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                Leave Encashment Request
              </h2>
            </div>

            <form onSubmit={handleEncashmentRequest} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                  Leave Type
                </label>
                <select
                  value={encashmentForm.leaveTypeCode}
                  onChange={e => setEncashmentForm(prev => ({ ...prev, leaveTypeCode: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                  required
                >
                  {encashmentEligibleTypes.map(type => (
                    <option key={type.code} value={type.code}>
                      {type.name} ({type.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    Year
                  </label>
                  <input
                    type="number"
                    value={encashmentForm.year}
                    onChange={e => setEncashmentForm(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                    min="2000"
                    max="2100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={encashmentForm.daysRequested}
                    onChange={e =>
                      setEncashmentForm(prev => ({ ...prev, daysRequested: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                    min="0.5"
                    max="365"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                  Note
                </label>
                <textarea
                  value={encashmentForm.note}
                  onChange={e => setEncashmentForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text h-24 resize-none"
                  placeholder="Optional note for payroll/admin..."
                />
              </div>

              <div className="rounded-lg p-3 bg-light-bg dark:bg-dark-bg ring-1 ring-light-border dark:ring-dark-border text-sm text-light-text dark:text-dark-text">
                {encashmentQuoteLoading ? (
                  <p className="opacity-75">Calculating encashment quote...</p>
                ) : encashmentQuote ? (
                  <div className="space-y-1">
                    <p>
                      Eligible days available:{' '}
                      <strong>{Number(encashmentQuote.balance?.available || 0).toFixed(1)}</strong>
                    </p>
                    <p>
                      Estimated amount/day: <strong>INR {Number(encashmentQuote.amountPerDay || 0).toFixed(2)}</strong>
                    </p>
                    <p>
                      Estimated payout: <strong>INR {Number(encashmentQuote.amountTotal || 0).toFixed(2)}</strong>
                    </p>
                  </div>
                ) : (
                  <p className="opacity-75">Enter year and days to preview encashment amount.</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isEncashmentSubmitBlocked}
                  className="w-full sm:flex-1 px-4 py-2.5 bg-info hover:bg-info/90 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingEncashment ? 'Submitting...' : 'Submit Encashment'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEncashmentModalOpen(false)}
                  className="w-full sm:flex-1 px-4 py-2.5 bg-light-bg dark:bg-dark-bg hover:bg-light-card dark:hover:bg-dark-card text-light-text dark:text-dark-text rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
        </ModalShell>
      )}

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick={true}
        autoClose={1200}
      />
    </div>
  );
};

export default Leaves;
