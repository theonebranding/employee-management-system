import ScheduledReport from '../models/scheduledReportSchema.js';
import ScheduledReportRun from '../models/scheduledReportRunSchema.js';
import { enqueueJob } from '../services/asyncJobService.js';
import { generateDrilldowns, generateExecutiveKpis, generateTrendSeries } from '../services/reportingService.js';

export const getExecutiveKpis = async (req, res) => {
  try {
    const { month, year, department, location, managerId } = req.query;
    const data = await generateExecutiveKpis({ month, year, department, location, managerId });
    return res.status(200).json({ message: 'Executive KPIs fetched successfully', ...data });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching executive KPIs', error: error.message });
  }
};

export const getExecutiveDrilldowns = async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await generateDrilldowns({ month, year });
    return res.status(200).json({ message: 'Executive drilldowns fetched successfully', ...data });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching drilldowns', error: error.message });
  }
};

export const getExecutiveTrends = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const data = await generateTrendSeries({ months: Number(months) || 6 });
    return res.status(200).json({ message: 'Executive trends fetched successfully', ...data });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching executive trends', error: error.message });
  }
};

export const createScheduledReport = async (req, res) => {
  try {
    const report = await ScheduledReport.create({
      ...req.body,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });
    return res.status(201).json({ message: 'Scheduled report created successfully', report });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating scheduled report', error: error.message });
  }
};

export const listScheduledReports = async (req, res) => {
  try {
    const reports = await ScheduledReport.find().sort({ createdAt: -1 });
    return res.status(200).json({ message: 'Scheduled reports fetched successfully', reports });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching scheduled reports', error: error.message });
  }
};

export const updateScheduledReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await ScheduledReport.findByIdAndUpdate(
      reportId,
      { ...req.body, updatedBy: req.user?._id || null },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({ message: 'Scheduled report not found' });
    }

    return res.status(200).json({ message: 'Scheduled report updated successfully', report });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating scheduled report', error: error.message });
  }
};

export const runScheduledReportNow = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await ScheduledReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Scheduled report not found' });
    }

    const run = await ScheduledReportRun.create({
      reportId: report._id,
      triggeredBy: 'manual',
      status: 'queued',
      format: report.format,
      deliveredTo: report.recipients,
    });

    const job = await enqueueJob({
      queue: 'scheduled-reports',
      type: 'reporting:scheduled-export',
      payload: {
        reportId: report._id,
        reportRunId: run._id,
        triggeredBy: 'manual',
      },
    });

    run.jobId = job._id;
    await run.save();

    return res
      .status(202)
      .json({ message: 'Scheduled report run queued successfully', jobId: job._id, runId: run._id });
  } catch (error) {
    return res.status(500).json({ message: 'Error queueing scheduled report run', error: error.message });
  }
};

export const listScheduledReportRuns = async (req, res) => {
  try {
    const { reportId } = req.params;
    const runs = await ScheduledReportRun.find({ reportId }).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ message: 'Scheduled report runs fetched successfully', runs });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching scheduled report runs', error: error.message });
  }
};
