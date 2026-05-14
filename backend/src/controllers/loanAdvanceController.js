import LoanAdvance from '../models/loanAdvanceSchema.js';
import Payroll from '../models/payrollSchema.js';
import { toIstDate } from '../utils/timezoneUtils.js';

const isPayrollPaidForTransactionMonth = async (employeeId, transactionDate) => {
  const istDate = toIstDate(transactionDate);
  const month = istDate.getUTCMonth() + 1;
  const year = istDate.getUTCFullYear();

  const payroll = await Payroll.findOne({ employee: employeeId, month, year }).lean();
  return payroll?.status === 'paid';
};
  
// Get loan advances
export const getLoanAdvances = async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const query = {};
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    const loans = await LoanAdvance.find(query)
      .populate('employee', 'name email employeeCode')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Loan advances fetched successfully',
      loans,
      loanAdvances: loans,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching loan advances', error: error.message });
  }
};

// Create loan advance
export const createLoanAdvance = async (req, res) => {
  try {
    const { employeeId, type, amount, transactionDate, reference, installmentType, monthlyInstallment, tenureMonths, comment } = req.body;

    if (!employeeId || !type || !amount || !transactionDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (await isPayrollPaidForTransactionMonth(employeeId, transactionDate)) {
      return res.status(409).json({
        message: 'Cannot add loan/advance: payroll is already paid for this month',
      });
    }

    const loanAdvance = new LoanAdvance({
      employee: employeeId,
      type,
      amount,
      transactionDate,
      reference,
      installmentType,
      monthlyInstallment,
      tenureMonths,
      comment,
      approvedBy: req.user?._id,
      approvedAt: new Date(),
    });

    await loanAdvance.save();
    res.status(201).json({ message: 'Loan advance created successfully', loanAdvance });
  } catch (error) {
    res.status(500).json({ message: 'Error creating loan advance', error: error.message });
  }
};

// Update loan advance
export const updateLoanAdvance = async (req, res) => {
  try {
    const { loanId } = req.params;
    const updates = req.body;

    const existingLoanAdvance = await LoanAdvance.findById(loanId);
    if (!existingLoanAdvance) {
      return res.status(404).json({ message: 'Loan advance not found' });
    }

    const targetEmployeeId = updates.employee || existingLoanAdvance.employee;
    const targetTransactionDate = updates.transactionDate || existingLoanAdvance.transactionDate;

    if (await isPayrollPaidForTransactionMonth(targetEmployeeId, targetTransactionDate)) {
      return res.status(409).json({
        message: 'Cannot update loan/advance: payroll is already paid for this month',
      });
    }

    const loanAdvance = await LoanAdvance.findByIdAndUpdate(loanId, updates, { new: true });

    res.status(200).json({ message: 'Loan advance updated successfully', loanAdvance });
  } catch (error) {
    res.status(500).json({ message: 'Error updating loan advance', error: error.message });
  }
};

// Delete loan advance
export const deleteLoanAdvance = async (req, res) => {
  try {
    const { loanId } = req.params;

    const existingLoanAdvance = await LoanAdvance.findById(loanId);
    if (!existingLoanAdvance) {
      return res.status(404).json({ message: 'Loan advance not found' });
    }

    if (
      await isPayrollPaidForTransactionMonth(
        existingLoanAdvance.employee,
        existingLoanAdvance.transactionDate
      )
    ) {
      return res.status(409).json({
        message: 'Cannot delete loan/advance: payroll is already paid for this month',
      });
    }

    const loanAdvance = await LoanAdvance.findByIdAndDelete(loanId);
    if (!loanAdvance) {
      return res.status(404).json({ message: 'Loan advance not found' });
    }

    res.status(200).json({ message: 'Loan advance deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting loan advance', error: error.message });
  }
};
