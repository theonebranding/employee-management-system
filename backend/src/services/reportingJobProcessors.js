import ScheduledReport from '../models/scheduledReportSchema.js';
import ScheduledReportRun from '../models/scheduledReportRunSchema.js';
import { registerJobProcessor } from './asyncJobService.js';
import { generateDrilldowns, generateExecutiveKpis } from './reportingService.js';

const toCsvRows = (rows = []) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escaped = (value) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  };

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escaped(row[header])).join(',')),
  ].join('\n');
};

const buildReportPayload = async (report) => {
  const filters = report.filters || {};

  if (report.reportType === 'executive-kpi') {
    const kpi = await generateExecutiveKpis(filters);
    return {
      type: 'executive-kpi',
      json: kpi,
      csv: toCsvRows([
        {
          month: kpi.period.month,
          year: kpi.period.year,
          headcount: kpi.kpis.headcount,
          absenteeismRate: kpi.kpis.absenteeismRate,
          overtimeCost: kpi.kpis.overtimeCost,
          leaveLiability: kpi.kpis.leaveLiability,
          payrollVariance: kpi.kpis.payrollVariance,
        },
      ]),
    };
  }

  const drilldowns = await generateDrilldowns(filters);
  const rows = [
    ...drilldowns.byDepartment.map((item) => ({ ...item, dimension: 'department' })),
    ...drilldowns.byLocation.map((item) => ({ ...item, dimension: 'location' })),
    ...drilldowns.byManager.map((item) => ({ ...item, dimension: 'manager' })),
  ];

  return {
    type: 'drilldowns',
    json: drilldowns,
    csv: toCsvRows(rows),
  };
};

export const registerReportingProcessors = () => {
  registerJobProcessor('reporting:scheduled-export', async (payload) => {
    const report = await ScheduledReport.findById(payload.reportId);
    const run = payload.reportRunId
      ? await ScheduledReportRun.findById(payload.reportRunId)
      : await ScheduledReportRun.create({
          reportId: payload.reportId,
          triggeredBy: payload.triggeredBy || 'system',
          status: 'queued',
          format: report?.format || 'csv',
          deliveredTo: report?.recipients || [],
        });

    if (!report || !report.isActive) {
      if (run) {
        run.status = 'failed';
        run.error = 'Report missing or inactive';
        await run.save();
      }
      return { skipped: true, reason: 'Report missing or inactive' };
    }

    try {
      const exportPayload = await buildReportPayload(report);
      const timestamp = new Date();

      report.lastRunAt = timestamp;
      report.lastRunStatus = 'success';
      report.lastRunResult = {
        exportType: exportPayload.type,
        format: report.format,
        deliveredTo: report.recipients,
        generatedAt: timestamp.toISOString(),
        bytes: exportPayload.csv.length,
        preview: exportPayload.csv.slice(0, 2000),
      };
      await report.save();

      if (run) {
        run.status = 'success';
        run.outputType = exportPayload.type;
        run.format = report.format;
        run.deliveredTo = report.recipients;
        run.bytes = exportPayload.csv.length;
        run.preview = exportPayload.csv.slice(0, 2000);
        run.error = '';
        await run.save();
      }

      return {
        reportId: report._id,
        deliveredTo: report.recipients,
        generatedAt: timestamp.toISOString(),
        format: report.format,
        exportType: exportPayload.type,
      };
    } catch (error) {
      report.lastRunAt = new Date();
      report.lastRunStatus = 'failed';
      report.lastRunResult = { error: error.message };
      await report.save();

      if (run) {
        run.status = 'failed';
        run.error = error.message;
        await run.save();
      }

      throw error;
    }
  });
};
