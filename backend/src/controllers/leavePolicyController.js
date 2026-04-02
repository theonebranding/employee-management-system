import LeaveBalance from '../models/leaveBalanceSchema.js';
import LeaveEncashment from '../models/leaveEncashmentSchema.js';
import LeaveType from '../models/leaveTypeSchema.js';
import { enqueueJob } from '../services/asyncJobService.js';
import {
  applyEncashmentDecision,
  createEncashmentRequest,
  getEncashmentQuote,
  previewLeaveRequest,
  runLeaveAccrual,
  runYearEndCarryForward,
} from '../services/leavePolicyService.js';

const resolveTargetEmployeeId = (req, incomingEmployeeId) => {
  const isAdmin = req.user?.role === 'admin';
  if (isAdmin && incomingEmployeeId) {
    return incomingEmployeeId;
  }
  return req.user?._id;
};

export const listLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find().sort({ name: 1 });
    return res.status(200).json({ message: 'Leave types fetched successfully', leaveTypes });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching leave types', error: error.message });
  }
};

export const createLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.create(req.body);
    return res.status(201).json({ message: 'Leave type created successfully', leaveType });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating leave type', error: error.message });
  }
};

export const updateLeaveType = async (req, res) => {
  try {
    const { code } = req.params;
    const leaveType = await LeaveType.findOneAndUpdate({ code }, req.body, {
      new: true,
      runValidators: true,
    });
    if (!leaveType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }
    return res.status(200).json({ message: 'Leave type updated successfully', leaveType });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating leave type', error: error.message });
  }
};

export const listLeaveBalances = async (req, res) => {
  try {
    const { employeeId, year, leaveTypeCode } = req.query;
    const filters = {};
    if (employeeId) filters.employee = employeeId;
    if (year) filters.year = Number(year);
    if (leaveTypeCode) filters.leaveTypeCode = leaveTypeCode;

    if (req.user.role === 'employee') {
      filters.employee = req.user._id;
    }

    const balances = await LeaveBalance.find(filters)
      .sort({ year: -1, leaveTypeCode: 1 })
      .populate('employee', 'name email department location');
    return res.status(200).json({ message: 'Leave balances fetched successfully', balances });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching leave balances', error: error.message });
  }
};

export const adjustLeaveBalance = async (req, res) => {
  try {
    const { employeeId, leaveTypeCode, year, adjustment = 0, note = '' } = req.body;
    if (!employeeId || !leaveTypeCode || !year) {
      return res.status(400).json({ message: 'employeeId, leaveTypeCode and year are required' });
    }

    const balance = await LeaveBalance.findOneAndUpdate(
      { employee: employeeId, leaveTypeCode, year: Number(year) },
      {
        $inc: { adjustments: Number(adjustment || 0) },
      },
      { upsert: true, new: true }
    );

    balance.available =
      Number(balance.openingBalance || 0) +
      Number(balance.accrued || 0) +
      Number(balance.adjustments || 0) -
      Number(balance.used || 0) -
      Number(balance.encashed || 0) -
      Number(balance.lapsed || 0);
    await balance.save();

    return res.status(200).json({
      message: 'Leave balance adjusted successfully',
      note,
      balance,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error adjusting leave balance', error: error.message });
  }
};

export const enqueueAccrualRun = async (req, res) => {
  try {
    const { month, year } = req.body;
    const job = await enqueueJob({
      queue: 'leave-accrual',
      type: 'leave:accrual-run',
      payload: {
        month: Number(month),
        year: Number(year),
        initiatedBy: req.user._id,
      },
    });

    return res.status(202).json({ message: 'Leave accrual run queued successfully', jobId: job._id });
  } catch (error) {
    return res.status(500).json({ message: 'Error queueing leave accrual run', error: error.message });
  }
};

export const runAccrualImmediately = async (req, res) => {
  try {
    const { month, year } = req.body;
    const run = await runLeaveAccrual({ month, year, initiatedBy: req.user._id });
    return res.status(200).json({ message: 'Leave accrual run completed', run });
  } catch (error) {
    return res.status(500).json({ message: 'Error running leave accrual', error: error.message });
  }
};

export const createLeaveEncashment = async (req, res) => {
  try {
    const employeeId = resolveTargetEmployeeId(req, req.body.employeeId);
    const { leaveTypeCode, year, daysRequested, note = '' } = req.body;

    if (!leaveTypeCode || !year || !daysRequested) {
      return res
        .status(400)
        .json({ message: 'leaveTypeCode, year and daysRequested are required' });
    }

    const result = await createEncashmentRequest({
      employeeId,
      leaveTypeCode,
      year,
      daysRequested,
      note,
    });

    if (!result.success) {
      return res.status(409).json({ message: result.message, balance: result.balance || null });
    }

    return res.status(201).json({
      message: 'Leave encashment request created successfully',
      request: result.request,
      quote: result.quote,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error creating leave encashment request', error: error.message });
  }
};

export const previewEncashment = async (req, res) => {
  try {
    const employeeId = resolveTargetEmployeeId(req, req.query.employeeId);
    const { leaveTypeCode, year, daysRequested } = req.query;

    const quote = await getEncashmentQuote({
      employeeId,
      leaveTypeCode,
      year: Number(year),
      daysRequested: Number(daysRequested),
    });

    if (!quote.success) {
      return res.status(409).json({ message: quote.message, balance: quote.balance || null });
    }

    return res.status(200).json({ message: 'Encashment quote generated successfully', quote });
  } catch (error) {
    return res.status(500).json({ message: 'Error generating encashment quote', error: error.message });
  }
};

export const previewLeave = async (req, res) => {
  try {
    const employeeId = resolveTargetEmployeeId(req, req.query.employeeId);
    const { leaveTypeCode, startDate, endDate } = req.query;

    const result = await previewLeaveRequest({
      employeeId,
      leaveTypeCode,
      startDate,
      endDate,
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ message: result.message });
    }

    return res.status(200).json({ message: 'Leave preview generated successfully', preview: result.preview });
  } catch (error) {
    return res.status(500).json({ message: 'Error generating leave preview', error: error.message });
  }
};

export const listLeaveEncashments = async (req, res) => {
  try {
    const { employeeId, status, year } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (year) filters.year = Number(year);

    if (req.user.role === 'employee') {
      filters.employee = req.user._id;
    } else if (employeeId) {
      filters.employee = employeeId;
    }

    const requests = await LeaveEncashment.find(filters)
      .sort({ createdAt: -1 })
      .populate('employee', 'name email department location')
      .populate('decidedBy', 'name email');

    return res
      .status(200)
      .json({ message: 'Leave encashment requests fetched successfully', requests });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching leave encashment requests', error: error.message });
  }
};

export const decideLeaveEncashment = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { decision, approvedDays, note = '' } = req.body;

    const result = await applyEncashmentDecision({
      requestId,
      decision,
      decidedBy: req.user._id,
      approvedDays,
      note,
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ message: result.message });
    }

    return res.status(200).json({
      message: 'Leave encashment decision applied successfully',
      request: result.request,
      balance: result.balance || null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error applying leave encashment decision', error: error.message });
  }
};

export const queueYearEndCarryForward = async (req, res) => {
  try {
    const { sourceYear } = req.body;
    const job = await enqueueJob({
      queue: 'leave-accrual',
      type: 'leave:year-end-carry-forward',
      payload: {
        sourceYear: Number(sourceYear),
        initiatedBy: req.user._id,
      },
    });

    return res
      .status(202)
      .json({ message: 'Year-end carry-forward run queued successfully', jobId: job._id });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error queueing year-end carry-forward', error: error.message });
  }
};

export const runYearEndCarryForwardNow = async (req, res) => {
  try {
    const { sourceYear } = req.body;
    const run = await runYearEndCarryForward({ sourceYear, initiatedBy: req.user._id });
    return res.status(200).json({ message: 'Year-end carry-forward completed', run });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error running year-end carry-forward', error: error.message });
  }
};
