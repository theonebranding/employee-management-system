import mongoose from 'mongoose';
import DailyReport from '../models/dailyReportSchema.js';
import Employee from '../models/employeeSchema.js';
import {
  getStartOfIstDay,
  getEndOfIstDay,
  getIstDayKey,
  normalizeReportText,
} from '../utils/dailyReportUtils.js';

const applyDateRangeFilter = (query, startDate, endDate) => {
  if (!startDate && !endDate) {
    return;
  }

  query.reportDate = {};

  if (startDate) {
    query.reportDate.$gte = getStartOfIstDay(startDate);
  }

  if (endDate) {
    const end = getEndOfIstDay(endDate);
    query.reportDate.$lte = end;
  }
};

const applyStatusFilter = (query, status) => {
  if (status === 'filled') {
    query.reportText = { $ne: 'N/A' };
  }

  if (status === 'na') {
    query.reportText = 'N/A';
  }
};

export const upsertDailyReportForToday = async ({ employeeId, report, actorId, actorRole }) => {
  const dayKey = getIstDayKey();
  const reportDate = getStartOfIstDay();
  const reportText = normalizeReportText(report);

  return DailyReport.findOneAndUpdate(
    { employee: employeeId, dayKey },
    {
      $set: {
        reportText,
        updatedBy: actorId,
        updatedByRole: actorRole,
      },
      $setOnInsert: {
        employee: employeeId,
        dayKey,
        reportDate,
        createdBy: actorId,
        createdByRole: actorRole,
      },
    },
    { new: true, upsert: true }
  );
};

export const createDailyReport = async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { report } = req.body;

    const dailyReport = await upsertDailyReportForToday({
      employeeId,
      report,
      actorId: employeeId,
      actorRole: role,
    });

    return res.status(200).json({ message: 'Daily report saved successfully', dailyReport });
  } catch (error) {
    return res.status(500).json({ message: 'Error saving daily report', error: error.message });
  }
};

export const updateOwnDailyReport = async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    const { reportId } = req.params;
    const { report } = req.body;
    const reportText = normalizeReportText(report);

    const filter = reportId
      ? { _id: reportId, employee: employeeId }
      : { employee: employeeId, dayKey: getIstDayKey() };

    const dailyReport = await DailyReport.findOneAndUpdate(
      filter,
      {
        $set: {
          reportText,
          updatedBy: employeeId,
          updatedByRole: role,
        },
      },
      { new: true }
    );

    if (!dailyReport) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    return res.status(200).json({ message: 'Daily report updated successfully', dailyReport });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating daily report', error: error.message });
  }
};

export const deleteOwnDailyReport = async (req, res) => {
  try {
    const { _id: employeeId } = req.user;
    const { reportId } = req.params;

    const filter = reportId
      ? { _id: reportId, employee: employeeId }
      : { employee: employeeId, dayKey: getIstDayKey() };

    const deletedReport = await DailyReport.findOneAndDelete(filter);

    if (!deletedReport) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    return res.status(200).json({ message: 'Daily report deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting daily report', error: error.message });
  }
};

export const listDailyReports = async (req, res) => {
  try {
    const { search, employee, startDate, endDate, status, page, limit } = req.query;
    const query = {};

    if (employee) {
      query.employee = employee;
    }

    applyDateRangeFilter(query, startDate, endDate);
    applyStatusFilter(query, status);

    if (search) {
      const regex = new RegExp(search, 'i');
      const employees = await Employee.find({
        $or: [{ name: regex }, { email: regex }],
      }).select('_id');
      const employeeIds = employees.map((emp) => emp._id);

      query.$or = [
        { reportText: regex },
        { adminComment: regex },
        { employee: { $in: employeeIds } },
      ];
    }

    const skip = (page - 1) * limit;

    const [reports, totalReports] = await Promise.all([
      DailyReport.find(query)
        .populate('employee', 'name email phoneNumber jobRole')
        .sort({ reportDate: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      DailyReport.countDocuments(query),
    ]);

    return res.status(200).json({
      message: 'Daily reports fetched successfully',
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReports / limit),
        totalReports,
        limit,
      },
      reports,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching daily reports', error: error.message });
  }
};

export const updateDailyReportByAdmin = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { report, adminComment } = req.body;
    const { _id: adminId, role } = req.user;

    const updatePayload = {
      updatedBy: adminId,
      updatedByRole: role,
    };

    if (report !== undefined) {
      updatePayload.reportText = normalizeReportText(report);
    }

    if (adminComment !== undefined) {
      const trimmedComment = adminComment.trim();
      updatePayload.adminComment = trimmedComment.length ? trimmedComment : null;
    }

    const dailyReport = await DailyReport.findByIdAndUpdate(
      reportId,
      { $set: updatePayload },
      { new: true }
    ).populate('employee', 'name email phoneNumber jobRole');

    if (!dailyReport) {
      return res.status(404).json({ message: 'Daily report not found' });
    }

    return res.status(200).json({ message: 'Daily report updated successfully', dailyReport });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating daily report', error: error.message });
  }
};

export const getReportsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { role, _id: currentUserId } = req.user;
    const { search, startDate, endDate, status, page, limit } = req.query;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }

    if (role === 'employee' && currentUserId.toString() !== employeeId) {
      return res.status(403).json({ message: 'Access denied for this employee report list' });
    }

    const query = { employee: employeeId };

    applyDateRangeFilter(query, startDate, endDate);
    applyStatusFilter(query, status);

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ reportText: regex }, { adminComment: regex }];
    }

    const skip = (page - 1) * limit;

    const [reports, totalReports] = await Promise.all([
      DailyReport.find(query).sort({ reportDate: -1, updatedAt: -1 }).skip(skip).limit(limit),
      DailyReport.countDocuments(query),
    ]);

    return res.status(200).json({
      message: 'Employee daily reports fetched successfully',
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReports / limit),
        totalReports,
        limit,
      },
      reports,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching employee daily reports', error: error.message });
  }
};
