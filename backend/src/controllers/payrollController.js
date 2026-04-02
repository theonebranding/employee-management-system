import mongoose from 'mongoose';
import Employee from '../models/employeeSchema.js';
import PayrollChangeControl from '../models/payrollChangeControlSchema.js';
import PayrollRun from '../models/payrollRunSchema.js';
import Salary from '../models/salarySchema.js';
import {
  computeIndiaComplianceForSalary,
  generateComplianceExports,
} from '../services/indiaComplianceService.js';

const buildSalaryScopeFilter = async ({ month, year, scope = {} }) => {
  const filter = {
    salaryMonth: Number(month),
    salaryYear: Number(year),
  };

  const employeeScopeFilter = {};
  if (scope.department) employeeScopeFilter.department = scope.department;
  if (scope.location) employeeScopeFilter.location = scope.location;
  if (scope.costCenter) employeeScopeFilter.costCenter = scope.costCenter;

  let scopedEmployeeIds = [];
  if (Object.keys(employeeScopeFilter).length > 0) {
    const scopedEmployees = await Employee.find(employeeScopeFilter).select('_id').lean();
    scopedEmployeeIds = scopedEmployees.map((employee) => employee._id);
  }

  if (Array.isArray(scope.employeeIds) && scope.employeeIds.length > 0) {
    const explicitIds = scope.employeeIds.filter(Boolean);
    scopedEmployeeIds = scopedEmployeeIds.length
      ? scopedEmployeeIds.filter((id) => explicitIds.some((explicitId) => String(explicitId) === String(id)))
      : explicitIds;
  }

  if (scopedEmployeeIds.length > 0) {
    filter.employee = { $in: scopedEmployeeIds };
  } else if (Object.keys(employeeScopeFilter).length > 0) {
    filter.employee = { $in: [] };
  }

  return filter;
};

const calculateTotals = (salaries = []) => {
  const totals = salaries.reduce(
    (acc, salary) => {
      acc.headcount += 1;
      acc.gross += Number(salary.baseSalary || 0) + Number(salary.bonuses || 0);
      acc.deductions += Number(salary.deductions || 0);
      acc.net += Number(salary.totalSalary || 0);
      return acc;
    },
    { headcount: 0, gross: 0, deductions: 0, net: 0 }
  );

  return {
    headcount: totals.headcount,
    gross: Number(totals.gross.toFixed(2)),
    deductions: Number(totals.deductions.toFixed(2)),
    net: Number(totals.net.toFixed(2)),
  };
};

const assertRunForTransition = (run, allowed) => {
  if (!run) {
    return { valid: false, status: 404, message: 'Payroll run not found' };
  }
  if (!allowed.includes(run.status)) {
    return {
      valid: false,
      status: 400,
      message: `Invalid transition from ${run.status}. Allowed states: ${allowed.join(', ')}`,
    };
  }
  return { valid: true };
};

export const createPayrollRun = async (req, res) => {
  try {
    const { name, month, year, scope = {} } = req.body;

    if (!month || !year || !name) {
      return res.status(400).json({ message: 'name, month, and year are required' });
    }

    const run = await PayrollRun.create({
      name,
      month: Number(month),
      year: Number(year),
      status: 'draft',
      scope,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    return res.status(201).json({ message: 'Payroll run created successfully', run });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating payroll run', error: error.message });
  }
};

export const listPayrollRuns = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    const filters = {};
    if (month) filters.month = Number(month);
    if (year) filters.year = Number(year);
    if (status) filters.status = status;

    const runs = await PayrollRun.find(filters)
      .sort({ year: -1, month: -1, createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('lockedBy', 'name email')
      .populate('releasedBy', 'name email');

    return res.status(200).json({ message: 'Payroll runs fetched successfully', runs });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching payroll runs', error: error.message });
  }
};

export const getPayrollRunById = async (req, res) => {
  try {
    const { runId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(runId)) {
      return res.status(400).json({ message: 'Invalid payroll run id' });
    }

    const run = await PayrollRun.findById(runId)
      .populate('includedSalaryIds')
      .populate('createdBy', 'name email')
      .populate('lockedBy', 'name email')
      .populate('releasedBy', 'name email');

    if (!run) {
      return res.status(404).json({ message: 'Payroll run not found' });
    }

    return res.status(200).json({ message: 'Payroll run fetched successfully', run });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching payroll run', error: error.message });
  }
};

export const validatePayrollRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const run = await PayrollRun.findById(runId);
    const transitionCheck = assertRunForTransition(run, ['draft', 'validated']);
    if (!transitionCheck.valid) {
      return res.status(transitionCheck.status).json({ message: transitionCheck.message });
    }

    const salaries = await Salary.find(await buildSalaryScopeFilter(run));
    if (salaries.length === 0) {
      return res.status(400).json({ message: 'No salary records found for this payroll run scope' });
    }

    const complianceRecords = salaries.map((salary) => computeIndiaComplianceForSalary(salary));
    const errors = complianceRecords.flatMap((entry) => entry.errors);
    const warnings = complianceRecords.flatMap((entry) => entry.warnings);

    run.includedSalaryIds = salaries.map((salary) => salary._id);
    run.totals = calculateTotals(salaries);
    run.status = 'validated';
    run.complianceSummary = {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      generatedExports: [],
      validatedAt: new Date(),
    };
    run.updatedBy = req.user?._id || null;
    await run.save();

    return res.status(200).json({
      message: 'Payroll run validated successfully',
      run,
      complianceRecords,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error validating payroll run', error: error.message });
  }
};

export const lockPayrollRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const run = await PayrollRun.findById(runId);
    const transitionCheck = assertRunForTransition(run, ['validated']);
    if (!transitionCheck.valid) {
      return res.status(transitionCheck.status).json({ message: transitionCheck.message });
    }

    if (!run.complianceSummary?.isCompliant) {
      return res
        .status(400)
        .json({ message: 'Compliance validation failed. Fix issues before locking payroll run.' });
    }

    run.status = 'locked';
    run.lockedAt = new Date();
    run.lockedBy = req.user?._id || null;
    run.updatedBy = req.user?._id || null;
    await run.save();

    await Salary.updateMany(
      { _id: { $in: run.includedSalaryIds } },
      { $set: { payrollRun: run._id, payrollLockState: 'locked' } }
    );

    return res.status(200).json({ message: 'Payroll run locked successfully', run });
  } catch (error) {
    return res.status(500).json({ message: 'Error locking payroll run', error: error.message });
  }
};

export const releasePayrollRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const run = await PayrollRun.findById(runId);
    const transitionCheck = assertRunForTransition(run, ['locked']);
    if (!transitionCheck.valid) {
      return res.status(transitionCheck.status).json({ message: transitionCheck.message });
    }

    const salaries = await Salary.find({ _id: { $in: run.includedSalaryIds } });
    const complianceRecords = salaries.map((salary) => computeIndiaComplianceForSalary(salary));
    const exports = generateComplianceExports(complianceRecords, { month: run.month, year: run.year });

    run.status = 'released';
    run.releasedAt = new Date();
    run.releasedBy = req.user?._id || null;
    run.updatedBy = req.user?._id || null;
    run.complianceSummary.generatedExports = Object.keys(exports);
    await run.save();

    await Salary.updateMany(
      { _id: { $in: run.includedSalaryIds } },
      { $set: { payrollRun: run._id, payrollLockState: 'released' } }
    );

    return res.status(200).json({
      message: 'Payroll run released successfully',
      run,
      exports,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error releasing payroll run', error: error.message });
  }
};

export const requestPayrollRunUnlock = async (req, res) => {
  try {
    const { runId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ message: 'Unlock reason is required' });
    }

    const run = await PayrollRun.findById(runId);
    const transitionCheck = assertRunForTransition(run, ['locked', 'released']);
    if (!transitionCheck.valid) {
      return res.status(transitionCheck.status).json({ message: transitionCheck.message });
    }

    const request = await PayrollChangeControl.create({
      payrollRun: run._id,
      action: 'unlock_request',
      reason,
      requestedBy: req.user._id,
      status: 'pending',
    });

    return res.status(201).json({ message: 'Unlock request created successfully', request });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error creating payroll unlock request', error: error.message });
  }
};

export const decidePayrollRunUnlock = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, decisionNote = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be approved or rejected' });
    }

    const request = await PayrollChangeControl.findById(requestId).populate('payrollRun');
    if (!request) {
      return res.status(404).json({ message: 'Change control request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    request.status = status;
    request.approvedBy = req.user._id;
    request.decisionNote = decisionNote;
    request.action = status === 'approved' ? 'unlock_approved' : 'unlock_rejected';
    await request.save();

    if (status === 'approved') {
      const run = await PayrollRun.findById(request.payrollRun._id);
      run.status = 'validated';
      run.changeControlNote = decisionNote || request.reason;
      run.updatedBy = req.user._id;
      await run.save();

      await Salary.updateMany(
        { _id: { $in: run.includedSalaryIds } },
        { $set: { payrollLockState: 'unlocked' }, $unset: { payrollRun: '' } }
      );
    }

    return res.status(200).json({ message: 'Change control request processed successfully', request });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error processing payroll unlock request', error: error.message });
  }
};

export const listPayrollChangeControls = async (req, res) => {
  try {
    const { status } = req.query;
    const filters = {};
    if (status) filters.status = status;

    const requests = await PayrollChangeControl.find(filters)
      .sort({ createdAt: -1 })
      .populate('payrollRun', 'name month year status')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email');

    return res
      .status(200)
      .json({ message: 'Payroll change controls fetched successfully', requests });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching payroll change controls', error: error.message });
  }
};
