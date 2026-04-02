import mongoose from 'mongoose';
import Leave from '../models/leaveSchema.js';
import { sendLeaveRequestEmail, sendLeaveStatusEmail } from '../services/emailService.js';
import Employee from '../models/employeeSchema.js';
import {
  createLeaveWorkflowInstance,
  transitionLeaveWorkflow,
} from '../services/workflowService.js';
import {
  calculateLeaveDays,
  consumeLeaveBalance,
  detectOverlapConflict,
} from '../services/leavePolicyService.js';
export const createLeave = async (req, res) => {
  try {
    const { reason, startDate, endDate, leaveTypeCode = 'ANNUAL' } = req.body;
    const { _id: employeeId, email: employeeEmail } = req.user;

    if (!reason || !startDate || !endDate) {
      return res.status(400).json({ message: 'Reason, start date, and end date are required' });
    }

    const employee = await Employee.findById(employeeId).select('manager location');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const [leaveCalculation, overlap] = await Promise.all([
      calculateLeaveDays({
        startDate,
        endDate,
        leaveTypeCode,
        location: employee.location || 'GLOBAL',
      }),
      detectOverlapConflict({ employeeId, startDate, endDate }),
    ]);

    if (leaveCalculation.error) {
      return res.status(400).json({ message: leaveCalculation.error });
    }

    if (Number(leaveCalculation.numberOfDays || 0) <= 0) {
      return res.status(400).json({
        message:
          'Requested leave duration has no payable/applicable days after weekend/holiday and sandwich policy evaluation',
      });
    }

    if (overlap.hasConflict) {
      return res.status(409).json({ message: overlap.message, overlapConflict: true });
    }

    const leave = new Leave({
      employee: employeeId,
      employeeEmail,
      reason,
      leaveTypeCode,
      startDate,
      endDate,
      numberOfDays: leaveCalculation.numberOfDays,
      sandwichDays: leaveCalculation.sandwichDays,
      overlapConflict: false,
      overlapConflictMessage: '',
    });

    await leave.save();

    const workflowInstance = await createLeaveWorkflowInstance({
      leaveId: leave._id,
      requesterId: employeeId,
      managerId: employee?.manager || null,
      metadata: { reason, startDate, endDate },
    });

    if (workflowInstance) {
      leave.workflowInstanceId = workflowInstance._id;
      leave.currentApprovalStep = workflowInstance.currentStepIndex + 1;
      await leave.save();
    }

    // Send email to admin for leave request
    await sendLeaveRequestEmail(employeeEmail, reason, startDate, endDate);
    // console.log("Email sent to admin for leave request");

    res.status(201).json({ message: 'Leave created successfully', leave });
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

    const leaves = await Leave.find({ employee: employeeId });
    res.status(200).json({ message: 'Leaves fetched successfully', leaves });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaves', error: err.message });
  }
};

// Admin - Update Leave Status
export const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, decisionNote = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Allowed values: approved, rejected' });
    }

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    const workflowTransition = await transitionLeaveWorkflow({
      leaveId: leave._id,
      actorId: req.user._id,
      decision: status,
      note: decisionNote,
    });

    if (workflowTransition.workflow) {
      leave.workflowInstanceId = workflowTransition.workflow._id;
      leave.currentApprovalStep = workflowTransition.workflow.currentStepIndex + 1;
    }

    leave.status = workflowTransition.status === 'pending' ? 'pending' : workflowTransition.status;

    if (leave.status === 'approved') {
      const leaveYear = new Date(leave.startDate).getUTCFullYear();
      const consumeResult = await consumeLeaveBalance({
        employeeId: leave.employee,
        leaveTypeCode: leave.leaveTypeCode || 'ANNUAL',
        year: leaveYear,
        numberOfDays: leave.numberOfDays || 0,
      });

      if (!consumeResult.success) {
        return res.status(409).json({
          message: consumeResult.message,
          leave,
          leaveBalance: consumeResult.balance || null,
        });
      }
    }

    await leave.save();

    if (leave.status === 'approved' || leave.status === 'rejected') {
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

    res.status(200).json({ message: 'Leave deleted successfully', leave });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting leave', error: err.message });
  }
};
