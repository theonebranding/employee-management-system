import mongoose from 'mongoose';
import Leave from '../models/leaveSchema.js';
import { sendLeaveRequestEmail, sendLeaveStatusEmail } from '../services/emailService.js';
import Employee from '../models/employeeSchema.js';
import LeaveTemplateAssignment from '../models/leaveTemplateAssignmentSchema.js';
import { getPayrollLeaveDaysForRange, getTemplateBalance } from '../utils/leaveTemplateUtils.js';
import {
  clearLeaveAttendanceMaster,
  syncLeaveAttendanceMaster,
} from '../utils/attendanceLeaveSync.js';
import { recomputePayrollForAttendanceChange } from './payrollController.js';
export const createLeave = async (req, res) => {
  try {
    const {
      reason,
      startDate,
      endDate,
      templateId,
      leaveMode = 'special',
      leaveCategory,
      documentName,
      documentType,
      documentData,
    } = req.body;
    const { _id: employeeId, email: employeeEmail } = req.user;

    if (!reason || !startDate || !endDate) {
      return res.status(400).json({ message: 'Reason, start date, and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ message: 'Valid start and end dates are required' });
    }

    let template = null;
    const isTemplateFlow = leaveMode === 'template' || Boolean(templateId);
    const requestedDays = await getPayrollLeaveDaysForRange({
      employeeId,
      startDate: start,
      endDate: end,
    });

    if (isTemplateFlow) {
      const templateAssignment = await LeaveTemplateAssignment.findOne({
        employee: employeeId,
        template: templateId,
      }).populate('template');

      if (!templateAssignment?.template) {
        return res.status(403).json({ message: 'This leave template is not assigned to you' });
      }

      template = templateAssignment.template;

      const balance = await getTemplateBalance({
        employeeId,
        template,
        referenceDate: start,
      });
      if (requestedDays > balance.remaining) {
        return res.status(400).json({
          message: `Requested ${requestedDays} day(s), but only ${balance.remaining} day(s) remain in this leave template period.`,
        });
      }
    } else {
      if (!leaveCategory) {
        return res
          .status(400)
          .json({ message: 'Leave category is required for special leave requests' });
      }

      if (!documentName || !documentType || !documentData) {
        return res
          .status(400)
          .json({ message: 'Supporting document is required for special leave requests' });
      }
    }

    const leave = new Leave({
      employee: employeeId,
      employeeEmail,
      reason,
      startDate,
      endDate,
      leaveMode: isTemplateFlow ? 'template' : 'special',
      leaveCategory: isTemplateFlow ? null : leaveCategory,
      template: template?._id || null,
      templateName: template?.name || null,
      isTemplateBased: Boolean(template),
      isPaidLeave: Boolean(template?.countAsPaidLeave),
      quotaDaysUsed: 0,
      paidDays: 0,
      unpaidDays: 0,
      documentName: isTemplateFlow ? null : documentName,
      documentType: isTemplateFlow ? null : documentType,
      documentData: isTemplateFlow ? null : documentData,
      status: template?.autoApprove ? 'approved' : 'pending',
    });

    if (leave.status === 'approved') {
      leave.quotaDaysUsed = requestedDays;
      leave.paidDays = template?.countAsPaidLeave === false ? 0 : requestedDays;
      leave.unpaidDays = Math.max(0, requestedDays - leave.paidDays);
    }

    await leave.save();

    if (leave.status === 'approved') {
      await syncLeaveAttendanceMaster({
        leaveId: leave._id,
        employeeId,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });

      const touchedMonths = new Set();
      const cursor = new Date(leave.startDate);
      const rangeEnd = new Date(leave.endDate);
      while (cursor <= rangeEnd) {
        touchedMonths.add(
          `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`
        );
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      for (const key of touchedMonths) {
        const [year, month] = key.split('-').map(Number);
        await recomputePayrollForAttendanceChange({
          employeeId,
          month,
          year,
          processedBy: req.user?._id,
        });
      }
    }

    if (!template?.autoApprove) {
      await sendLeaveRequestEmail(employeeEmail, reason, startDate, endDate);
    }

    res.status(201).json({
      message: template?.autoApprove
        ? 'Leave created and auto-approved successfully'
        : 'Leave created successfully',
      leave,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating leave', error: err.message });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, employeeEmail } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (startDate && endDate) {
      filters.startDate = { $gte: new Date(startDate) };
      filters.endDate = { $lte: new Date(endDate) };
    }

    if (employeeEmail) {
      const employee = await Employee.findOne({ email: employeeEmail }).select('_id');
      if (employee) filters.employee = employee._id;
    }

    const leaves = await Leave.find(filters)
      .populate('employee', 'email name')
      .populate(
        'template',
        'name autoAllocationCount autoAllocationPeriod countAsPaidLeave autoApprove'
      )
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ startDate: -1 });

    const totalLeaves = await Leave.countDocuments(filters);

    res.status(200).json({
      message: 'Leaves fetched successfully',
      leaves,
      totalPages: Math.ceil(totalLeaves / limit),
      currentPage: Number(page),
      total: totalLeaves,
      totalLeaves,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaves', error: err.message });
  }
};

// Employee - Get My Leaves
export const getMyLeaves = async (req, res) => {
  try {
    const employeeId = req.params.id || req.user._id;

    // Validate if employeeId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }

    const leaves = await Leave.find({ employee: employeeId }).populate(
      'template',
      'name autoAllocationCount autoAllocationPeriod'
    );
    res.status(200).json({ message: 'Leaves fetched successfully', leaves });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaves', error: err.message });
  }
};

// Admin - Update Leave Status
export const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, isPaidLeave, useTemplateQuota, templateId } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const existingLeave = await Leave.findById(leaveId);
    if (!existingLeave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    const updatePayload = { status };
    const isApproval = status === 'approved';
    const isRejection = status === 'rejected';
    const requestedDays = await getPayrollLeaveDaysForRange({
      employeeId: existingLeave.employee,
      startDate: existingLeave.startDate,
      endDate: existingLeave.endDate,
    });

    if (isApproval) {
      const useQuota = Boolean(useTemplateQuota);
      const wantsPaid = Boolean(isPaidLeave);

      updatePayload.quotaDaysUsed = 0;
      updatePayload.paidDays = 0;
      updatePayload.unpaidDays = 0;

      if (useQuota) {
        const assignment = await LeaveTemplateAssignment.findOne({
          employee: existingLeave.employee,
          template: templateId,
        }).populate('template');

        if (!assignment?.template) {
          return res.status(404).json({ message: 'Leave template not found for this employee' });
        }

        const balance = await getTemplateBalance({
          employeeId: existingLeave.employee,
          template: assignment.template,
          referenceDate: existingLeave.startDate,
        });
        const quotaDaysUsed = Math.min(requestedDays, balance.remaining);
        const extraDays = Math.max(0, requestedDays - quotaDaysUsed);

        updatePayload.template = assignment.template._id;
        updatePayload.templateName = assignment.template.name;
        updatePayload.isTemplateBased = true;
        updatePayload.leaveMode = 'template';
        updatePayload.quotaDaysUsed = quotaDaysUsed;
        updatePayload.paidDays = wantsPaid ? requestedDays : quotaDaysUsed;
        updatePayload.unpaidDays = wantsPaid ? 0 : extraDays;
        updatePayload.isPaidLeave = updatePayload.paidDays > 0;
      } else {
        updatePayload.isTemplateBased = false;
        updatePayload.leaveMode = 'special';
        updatePayload.template = null;
        updatePayload.templateName = null;
        updatePayload.leaveCategory = existingLeave.leaveCategory || null;
        updatePayload.quotaDaysUsed = 0;
        updatePayload.paidDays = wantsPaid ? requestedDays : 0;
        updatePayload.unpaidDays = wantsPaid ? 0 : requestedDays;
        updatePayload.isPaidLeave = updatePayload.paidDays > 0;
      }
    }

    if (isRejection) {
      updatePayload.isPaidLeave = false;
      updatePayload.isTemplateBased = false;
      updatePayload.leaveMode = 'special';
      updatePayload.template = null;
      updatePayload.templateName = null;
      updatePayload.quotaDaysUsed = 0;
      updatePayload.paidDays = 0;
      updatePayload.unpaidDays = requestedDays;
      updatePayload.leaveCategory = existingLeave.leaveCategory || null;
    }

    const leave = await Leave.findByIdAndUpdate(leaveId, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    if (isApproval) {
      await syncLeaveAttendanceMaster({
        leaveId: leave._id,
        employeeId: leave.employee,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
    }

    if (isRejection) {
      await clearLeaveAttendanceMaster(leave._id);
    }

    const touchedMonths = new Set();
    const cursor = new Date(leave.startDate);
    const rangeEnd = new Date(leave.endDate);
    while (cursor <= rangeEnd) {
      touchedMonths.add(
        `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`
      );
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const key of touchedMonths) {
      const [year, month] = key.split('-').map(Number);
      await recomputePayrollForAttendanceChange({
        employeeId: leave.employee,
        month,
        year,
        processedBy: req.user?._id,
      });
    }

    if (status === 'approved' || status === 'rejected') {
      // Send email to employee for leave approval/rejection
      await sendLeaveStatusEmail(
        leave.employeeEmail,
        leave.reason,
        leave.startDate,
        leave.endDate,
        leave.status
      );
    }

    res.status(200).json({ message: 'Leave status updated successfully', leave });
  } catch (err) {
    res.status(500).json({ message: 'Error updating leave status', error: err.message });
  }
};

// Admin - Delete Leave
export const deleteLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;

    const leave = await Leave.findByIdAndDelete(leaveId);
    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    await clearLeaveAttendanceMaster(leave._id);

    res.status(200).json({ message: 'Leave deleted successfully', leave });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting leave', error: err.message });
  }
};
