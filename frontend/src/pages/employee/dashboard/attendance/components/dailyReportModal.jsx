import { FileText, Loader2, Save, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const DailyReportModal = ({
  open,
  onClose,
  initialReportText = '',
  hasExistingReport = false,
  loading = false,
  onSave,
  onDelete,
}) => {
  const [reportText, setReportText] = useState('');

  useEffect(() => {
    if (!open) return;
    setReportText(initialReportText || '');
  }, [open, initialReportText]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl rounded-2xl border border-light-border bg-light-card p-5 shadow-card dark:border-dark-border dark:bg-dark-card sm:p-6">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-light-text hover:text-primary disabled:opacity-50 dark:text-dark-text"
          aria-label="Close daily report modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 pr-8">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-light-text dark:text-dark-text">
            <FileText className="h-5 w-5 text-primary" />
            Daily Report
          </h2>
          <p className="text-sm text-light-text opacity-70 dark:text-dark-text">
            {hasExistingReport
              ? 'Update your report for today, or delete it if no longer needed.'
              : 'No report for today yet. Add your report now.'}
          </p>
        </div>

        <textarea
          rows={7}
          maxLength={5000}
          value={reportText}
          onChange={e => setReportText(e.target.value)}
          placeholder="What did you work on today?"
          className="w-full rounded-xl border border-light-border bg-light-bg px-4 py-3 text-light-text placeholder-light-text focus:outline-none focus:ring-2 focus:ring-primary dark:border-dark-border dark:bg-dark-bg dark:text-dark-text dark:placeholder-dark-text"
        />

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {hasExistingReport && (
            <button
              onClick={onDelete}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-danger/10 px-4 py-2 text-danger hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          )}
          <button
            onClick={() => onSave(reportText.trim())}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {hasExistingReport ? 'Update Report' : 'Save Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyReportModal;
