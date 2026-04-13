import ExtraAllowance from '../models/extraAllowanceSchema.js';
import Payroll from '../models/payrollSchema.js';
import { toIstDate } from '../utils/timezoneUtils.js';

const isPayrollPaidForTransactionMonth = async (employeeId, transactionDate) => {
  const istDate = toIstDate(transactionDate);
  const month = istDate.getUTCMonth() + 1;
  const year = istDate.getUTCFullYear();

  const payroll = await Payroll.findOne({ employee: employeeId, month, year }).lean();
  return payroll?.status === 'paid';
};

// Get extra allowances
export const getExtraAllowances = async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const query = {};
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    const allowances = await ExtraAllowance.find(query)
      .populate('employee', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ message: 'Extra allowances fetched successfully', allowances });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching extra allowances', error: error.message });
  }
};

// Create extra allowance
export const createExtraAllowance = async (req, res) => {
  try {
    const { employeeId, amount, transactionDate, reference, comment } = req.body;

    if (!employeeId || !amount || !transactionDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (await isPayrollPaidForTransactionMonth(employeeId, transactionDate)) {
      return res.status(409).json({
        message: 'Cannot add extra allowance: payroll is already paid for this month',
      });
    }

    const extraAllowance = new ExtraAllowance({
      employee: employeeId,
      amount,
      transactionDate,
      reference,
      comment,
      approvedBy: req.user?._id,
      approvedAt: new Date(),
    });

    await extraAllowance.save();
    res.status(201).json({ message: 'Extra allowance created successfully', extraAllowance });
  } catch (error) {
    res.status(500).json({ message: 'Error creating extra allowance', error: error.message });
  }
};

// Update extra allowance
export const updateExtraAllowance = async (req, res) => {
  try {
    const { allowanceId } = req.params;
    const updates = req.body;

    const existingAllowance = await ExtraAllowance.findById(allowanceId);
    if (!existingAllowance) {
      return res.status(404).json({ message: 'Extra allowance not found' });
    }

    const targetEmployeeId = updates.employee || existingAllowance.employee;
    const targetTransactionDate = updates.transactionDate || existingAllowance.transactionDate;

    if (await isPayrollPaidForTransactionMonth(targetEmployeeId, targetTransactionDate)) {
      return res.status(409).json({
        message: 'Cannot update extra allowance: payroll is already paid for this month',
      });
    }

    const extraAllowance = await ExtraAllowance.findByIdAndUpdate(allowanceId, updates, { new: true });

    res.status(200).json({ message: 'Extra allowance updated successfully', extraAllowance });
  } catch (error) {
    res.status(500).json({ message: 'Error updating extra allowance', error: error.message });
  }
};

// Delete extra allowance
export const deleteExtraAllowance = async (req, res) => {
  try {
    const { allowanceId } = req.params;

    const existingAllowance = await ExtraAllowance.findById(allowanceId);
    if (!existingAllowance) {
      return res.status(404).json({ message: 'Extra allowance not found' });
    }

    if (
      await isPayrollPaidForTransactionMonth(existingAllowance.employee, existingAllowance.transactionDate)
    ) {
      return res.status(409).json({
        message: 'Cannot delete extra allowance: payroll is already paid for this month',
      });
    }

    const extraAllowance = await ExtraAllowance.findByIdAndDelete(allowanceId);
    if (!extraAllowance) {
      return res.status(404).json({ message: 'Extra allowance not found' });
    }

    res.status(200).json({ message: 'Extra allowance deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting extra allowance', error: error.message });
  }
};
