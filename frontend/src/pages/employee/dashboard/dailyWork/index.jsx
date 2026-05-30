import { FileText } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Slide, toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import Modal from '../../../../components/Modal';

const EmployeeDailyWork = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const employeeId = localStorage.getItem('_id');

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchDate, setSearchDate] = useState('');
  const [reports, setReports] = useState([]);
  const [todayReportText, setTodayReportText] = useState('');
  const [subject, setSubject] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [template, setTemplate] = useState('');
  const [openReportModal, setOpenReportModal] = useState(false);
  const [modalSubject, setModalSubject] = useState('');
  const [modalBody, setModalBody] = useState('');
  const [modalAdminComment, setModalAdminComment] = useState('');
  const reportsTableScrollRef = useRef(null);
  const reportsScrollIntervalRef = useRef(null);

  const fetchDailyReports = async () => {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(
      new Date(year, month, 0).getDate()
    ).padStart(2, '0')}`;
    try {
      const response = await fetch(
        `${BASE_URL}/daily-reports/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}&page=1&limit=100`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.errors?.[0]?.message || 'Failed to fetch daily reports');
      }
      const list = data.reports || [];
      setReports(list);

      const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const todayReport = list.find(
        (report) =>
          new Date(report.reportDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) ===
          todayKey
      );

      if (todayReport?.reportText && todayReport.reportText !== 'N/A') {
        const text = todayReport.reportText;
        // If report stored with Subject: ...\n\nBody, split it
        if (text.startsWith('Subject:')) {
          const parts = text.split(/\n\n/);
          const subjectLine = parts.shift() || '';
          const parsedSubject = subjectLine.replace(/^Subject:\s*/i, '').trim();
          const parsedBody = parts.join('\n\n').trim();
          setSubject(parsedSubject);
          setTodayReportText(parsedBody);
        } else {
          setSubject('');
          setTodayReportText(text);
        }
      } else {
        setSubject('');
        setTodayReportText('');
      }
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      toast.error(error.message || 'Failed to fetch daily reports');
    } finally {
      setLoading(false);
    }
  };

  const saveTodayDailyReport = async () => {
    setSaving(true);
    try {
      // Combine subject and body into a single report string so backend can store it
      const combinedReport = subject.trim()
        ? `Subject: ${subject.trim()}\n\n${todayReportText}`
        : todayReportText;

      const response = await fetch(`${BASE_URL}/daily-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ report: combinedReport }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.errors?.[0]?.message || 'Failed to save daily report');
      }
      toast.success(data.message || 'Daily report saved successfully');
      if (sessionStorage.getItem('pendingCheckoutAfterReport') === '1') {
        navigate('/employee/dashboard/attendance?autoCheckout=1', { replace: true });
        return;
      }
      fetchDailyReports();
    } catch (error) {
      console.error('Error saving daily report:', error);
      toast.error(error.message || 'Failed to save daily report');
    } finally {
      setSaving(false);
    }
  };

  const openReport = (record) => {
    const text = record.reportText || '';
    if (text.startsWith('Subject:')) {
      const parts = text.split(/\n\n/);
      const subjectLine = parts.shift() || '';
      const parsedSubject = subjectLine.replace(/^Subject:\s*/i, '').trim();
      const parsedBody = parts.join('\n\n').trim();
      setModalSubject(parsedSubject);
      setModalBody(parsedBody);
    } else {
      setModalSubject('');
      setModalBody(text === 'N/A' ? '' : text);
    }
    setModalAdminComment(record.adminComment || '');
    setTimeout(() => setOpenReportModal(true), 0);
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const checkoutBlocked = queryParams.get('checkoutBlocked') === '1';

    if (checkoutBlocked) {
      toast.info('Please submit your daily work report to complete check-out.');
      navigate('/employee/dashboard/daily-work', { replace: true });
    }

    const redirectMessage = sessionStorage.getItem('dailyWorkRedirectMessage');
    if (redirectMessage && !checkoutBlocked) {
      toast.info(redirectMessage);
    }
    sessionStorage.removeItem('dailyWorkRedirectMessage');

    fetchDailyReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, location.search, navigate]);

  const filteredReports = useMemo(() => {
    const sorted = [...reports].sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
    if (!searchDate.trim()) return sorted;
    return sorted.filter((item) =>
      new Date(item.reportDate).toLocaleDateString().includes(searchDate)
    );
  }, [reports, searchDate]);

  const stopReportsAutoScroll = () => {
    if (reportsScrollIntervalRef.current) {
      clearInterval(reportsScrollIntervalRef.current);
      reportsScrollIntervalRef.current = null;
    }
  };

  const startReportsAutoScroll = direction => {
    if (!reportsTableScrollRef.current) return;
    stopReportsAutoScroll();
    const step = direction === 'left' ? -18 : 18;
    reportsScrollIntervalRef.current = setInterval(() => {
      reportsTableScrollRef.current?.scrollBy({ left: step, behavior: 'auto' });
    }, 16);
  };

  useEffect(() => () => stopReportsAutoScroll(), []);

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Daily Work"
          description="Submit your daily work report and view admin comments."
          icon={<FileText className="w-8 h-8 text-light-text dark:text-dark-text" />}
        />

        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text text-sm"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i, 1).toLocaleDateString('default', { month: 'short' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text text-sm"
              >
                {[2024, 2025, 2026].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-[0.12em] text-light-text/60 dark:text-dark-text/60 mb-2">
                Search by Date
              </label>
              <input
                type="text"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                placeholder="Search date..."
                className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl border border-light-border dark:border-dark-border bg-white/80 dark:bg-dark-bg/70 p-4">
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
              Compose Daily Report (Mail style)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject (e.g. Today's progress on Project X)"
                  className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-card px-3 py-2 text-sm text-light-text dark:text-dark-text"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={template}
                  onChange={(e) => {
                    setTemplate(e.target.value);
                    if (e.target.value) {
                      // small templates for quick drafting
                      const templates = {
                        '': '',
                        'Standup Summary': `Planned:\n- \n\nCompleted:\n- \n\nBlockers:\n- `,
                        'Bug Fixes': `Fixed:\n- \n\nPending:\n- \n\nNotes:\n- `,
                      };
                      setTodayReportText(templates[e.target.value] || '');
                    }
                  }}
                  className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-card px-3 py-2 text-sm text-light-text dark:text-dark-text"
                >
                  <option value="">No template</option>
                  <option value="Standup Summary">Standup Summary</option>
                  <option value="Bug Fixes">Bug Fixes</option>
                </select>
              </div>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPreview((p) => !p);
                }}
                className="px-3 py-1 rounded-md bg-white/90 dark:bg-dark-card border border-light-border dark:border-dark-border text-sm"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>

            {!showPreview ? (
              <textarea
                rows={6}
                value={todayReportText}
                onChange={(e) => setTodayReportText(e.target.value)}
                placeholder="Write your work summary for today..."
                className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-card px-3 py-2 text-sm text-light-text dark:text-dark-text"
              />
            ) : (
              <div className="prose max-w-none p-3 rounded-lg border border-light-border dark:border-dark-border bg-white/50 dark:bg-dark-card text-light-text dark:text-dark-text text-sm">
                {/* simple markdown-ish preview: **bold**, *italic*, and line breaks */}
                <div
                  dangerouslySetInnerHTML={{
                    __html: (subject ? `<strong>${subject}</strong><br/><br/>` : '') +
                      todayReportText
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br/>'),
                  }}
                />
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={saveTodayDailyReport}
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Daily Report'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubject('');
                  setTodayReportText('');
                  setTemplate('');
                }}
                className="inline-flex items-center rounded-lg border border-light-border dark:border-dark-border px-4 py-2 text-sm font-medium text-light-text dark:text-dark-text"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="relative group/table">
            <div ref={reportsTableScrollRef} className="overflow-x-auto">
              {loading ? (
              <p className="text-sm text-light-text/70 dark:text-dark-text/70">Loading daily reports...</p>
            ) : filteredReports.length > 0 ? (
              <table className="min-w-full text-sm">
                <thead className="bg-light-bg dark:bg-dark-bg">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">View</th>
                    <th className="px-4 py-3 text-left font-semibold text-light-text/70 dark:text-dark-text/70">Admin Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((item) => (
                    <tr key={item._id} className="border-t border-light-border/70 dark:border-dark-border/70">
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        {new Date(item.reportDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">
                        <button
                          type="button"
                          onClick={() => openReport(item)}
                          className="px-2 py-1 rounded-md text-xs border border-light-border dark:border-dark-border bg-white/90 dark:bg-dark-card"
                        >
                          View
                        </button>
                      </td>
                      <td className="px-4 py-3 text-light-text dark:text-dark-text">{item.adminComment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-light-text/70 dark:text-dark-text/70">No daily reports found.</p>
            )}
            </div>
            <div
              className="absolute left-0 top-0 bottom-0 z-10 w-12 cursor-w-resize"
              onMouseEnter={() => startReportsAutoScroll('left')}
              onMouseLeave={stopReportsAutoScroll}
              aria-hidden="true"
            />
            <div
              className="absolute right-0 top-0 bottom-0 z-10 w-12 cursor-e-resize"
              onMouseEnter={() => startReportsAutoScroll('right')}
              onMouseLeave={stopReportsAutoScroll}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={1600}
        transition={Slide}
      />
      <Modal isOpen={openReportModal} onClose={() => setOpenReportModal(false)} title={`Report${modalSubject ? ` - ${modalSubject}` : ''}`} size="2xl">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={modalSubject}
            readOnly
            placeholder="Subject"
            className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg px-3 py-2 text-sm text-light-text dark:text-dark-text"
          />

          <textarea
            rows={8}
            value={modalBody}
            readOnly
            className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-card px-3 py-2 text-sm text-light-text dark:text-dark-text"
          />

          <div>
            <label className="block text-xs text-light-text/70 dark:text-dark-text/70 mb-2">Admin Comment</label>
            <textarea
              rows={3}
              value={modalAdminComment}
              readOnly
              className="w-full rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-card px-3 py-2 text-sm text-light-text dark:text-dark-text"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenReportModal(false)}
              className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeDailyWork;
