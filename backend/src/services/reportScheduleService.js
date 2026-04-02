import ScheduledReport from '../models/scheduledReportSchema.js';
import ScheduledReportRun from '../models/scheduledReportRunSchema.js';
import { enqueueJob } from './asyncJobService.js';

let scheduleHandle = null;

const parseTime = (value = '09:00') => {
  const [h, m] = value.split(':').map((x) => Number(x) || 0);
  return { hour: h, minute: m };
};

const hasRunRecently = (lastRunAt, hours) => {
  if (!lastRunAt) return false;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return new Date(lastRunAt).getTime() >= cutoff;
};

const shouldRun = (report, now) => {
  const { hour, minute } = parseTime(report.schedule?.time || '09:00');
  if (now.getUTCHours() !== hour || now.getUTCMinutes() < minute || now.getUTCMinutes() > minute + 9) {
    return false;
  }

  if (report.frequency === 'daily') {
    return !hasRunRecently(report.lastRunAt, 20);
  }

  if (report.frequency === 'weekly') {
    const desired = Number(report.schedule?.dayOfWeek ?? 1);
    return now.getUTCDay() === desired && !hasRunRecently(report.lastRunAt, 24 * 6);
  }

  if (report.frequency === 'monthly') {
    const desiredDay = Number(report.schedule?.dayOfMonth ?? 1);
    return now.getUTCDate() === desiredDay && !hasRunRecently(report.lastRunAt, 24 * 26);
  }

  return false;
};

const tickReportSchedules = async () => {
  const reports = await ScheduledReport.find({ isActive: true }).select(
    '_id frequency schedule lastRunAt isActive format recipients'
  );
  const now = new Date();

  for (const report of reports) {
    if (shouldRun(report, now)) {
      const run = await ScheduledReportRun.create({
        reportId: report._id,
        triggeredBy: 'scheduler',
        status: 'queued',
        format: report.format || 'csv',
        deliveredTo: report.recipients || [],
      });

      await enqueueJob({
        queue: 'scheduled-reports',
        type: 'reporting:scheduled-export',
        payload: { reportId: report._id, reportRunId: run._id, triggeredBy: 'scheduler' },
      });
    }
  }
};

export const startReportSchedulePolling = () => {
  if (scheduleHandle) return;

  scheduleHandle = setInterval(() => {
    tickReportSchedules().catch((error) => {
      console.error('Scheduled report polling error:', error.message);
    });
  }, 5 * 60 * 1000);
};
