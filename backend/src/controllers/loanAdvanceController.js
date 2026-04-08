import LoanAdvance from '../models/loanAdvanceSchema.js';
  
// Get loan advances
export const getLoanAdvances = async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const query = {};
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    const loans = await LoanAdvance.find(query)
      .populate('employee', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ message: 'Loan advances fetched successfully', loans });
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

    const loanAdvance = await LoanAdvance.findByIdAndUpdate(loanId, updates, { new: true });
    if (!loanAdvance) {
      return res.status(404).json({ message: 'Loan advance not found' });
    }

    res.status(200).json({ message: 'Loan advance updated successfully', loanAdvance });
  } catch (error) {
    res.status(500).json({ message: 'Error updating loan advance', error: error.message });
  }
};

// Delete loan advance
export const deleteLoanAdvance = async (req, res) => {
  try {
    const { loanId } = req.params;

    const loanAdvance = await LoanAdvance.findByIdAndDelete(loanId);
    if (!loanAdvance) {
      return res.status(404).json({ message: 'Loan advance not found' });
    }

    res.status(200).json({ message: 'Loan advance deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting loan advance', error: error.message });
  }
};
