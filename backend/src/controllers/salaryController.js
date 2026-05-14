import mongoose from 'mongoose';
import Salary from '../models/salarySchema.js';
import Employee from '../models/employeeSchema.js';
import Attendance from '../models/attendanceSchema.js';
import PayslipSettings from '../models/payslipSettingsSchema.js';
import sendEmail from '../services/sendEmail.js';
import { generatePayslipHtml, getDefaultPayslipSettings } from '../utils/payslipUtils.js';

const resolvePayslipSettings = async () => {
  let settings = await PayslipSettings.findOne();
  if (!settings) {
    settings = new PayslipSettings(getDefaultPayslipSettings());
    await settings.save();
  }
  return settings;
};

const pickTemplate = (settings, templateId) => {
  const selectedId = templateId || settings.activeTemplateId;
  return (
    settings.templates.find(template => template.id === selectedId) ||
    settings.templates[0] || {
      id: 'classic-template',
      name: 'Classic Ledger',
      accentStyle: 'classic',
    }
  );
};

const normalizeSalaryValues = ({ baseSalary = 0, bonuses = 0, deductions = 0 }) => {
  const base = Number(baseSalary) || 0;
  const bonus = Number(bonuses) || 0;
  const deduction = Number(deductions) || 0;

  return {
    baseSalary: base,
    bonuses: bonus,
    deductions: deduction,
    totalSalary: base + bonus - deduction,
  };
};

const parseMoneyField = (value, { field, required = false, min = 0 } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) return { error: `${field} is required` };
    return { value: undefined };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return { error: `${field} must be a valid number` };
  if (parsed < min) return { error: `${field} must be at least ${min}` };
  return { value: parsed };
};

const parseMonthYear = ({ month, year, defaultDate = new Date() }) => {
  const monthNum = month === undefined || month === null || month === '' ? defaultDate.getMonth() + 1 : Number(month);
  const yearNum = year === undefined || year === null || year === '' ? defaultDate.getFullYear() : Number(year);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return { error: 'Salary month must be between 1 and 12' };
  }
  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
    return { error: 'Salary year must be between 2000 and 2100' };
  }
  return { value: { month: monthNum, year: yearNum } };
};

const parseEffectiveDate = value => {
  if (value === undefined) return { value: undefined };
  if (value === null || value === '') return { value: null };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { error: 'Effective date is invalid' };
  return { value: parsed };
};

const sanitizeReason = value => {
  if (value === undefined) return { value: undefined };
  const trimmed = String(value || '').trim();
  if (trimmed.length > 200) return { error: 'Revision reason cannot exceed 200 characters' };
  return { value: trimmed || null };
};

export const addSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    const {
      baseSalary,
      bonuses = 0,
      deductions = 0,
      salaryMonth,
      salaryYear,
      effectiveFrom,
      revisionReason,
    } = req.body;

    const parsedBase = parseMoneyField(baseSalary, { field: 'Base salary', required: true, min: 1 });
    const parsedBonuses = parseMoneyField(bonuses, { field: 'Bonuses', min: 0 });
    const parsedDeductions = parseMoneyField(deductions, { field: 'Deductions', min: 0 });
    const parsedMonthYear = parseMonthYear({ month: salaryMonth, year: salaryYear });
    const parsedEffectiveFrom = parseEffectiveDate(effectiveFrom);
    const parsedReason = sanitizeReason(revisionReason);
    const firstError = [
      parsedBase.error,
      parsedBonuses.error,
      parsedDeductions.error,
      parsedMonthYear.error,
      parsedEffectiveFrom.error,
      parsedReason.error,
    ].find(Boolean);
    if (firstError) {
      return res.status(400).json({ message: firstError });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const normalized = normalizeSalaryValues({
      baseSalary: parsedBase.value,
      bonuses: parsedBonuses.value ?? 0,
      deductions: parsedDeductions.value ?? 0,
    });

    const salary = new Salary({
      employee: employeeId,
      employeeName: employee.name,
      employeeEmail: employee.email,
      ...normalized,
      salaryMonth: parsedMonthYear.value.month,
      salaryYear: parsedMonthYear.value.year,
      effectiveFrom: parsedEffectiveFrom.value === undefined ? new Date() : parsedEffectiveFrom.value,
      revisionReason: parsedReason.value || 'Initial onboarding salary',
    });

    await salary.save();

    return res.status(201).json({ message: 'Salary added successfully', salary });
  } catch (err) {
    return res.status(500).json({ message: 'Error adding salary', error: err.message });
  }
};

export const generatePayslip = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { salaryId, month, year, templateId, sendByEmail = false, baseSalary, bonuses, deductions } = req.body;

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const payslipMonth = Number(month) || new Date().getMonth() + 1;
    const payslipYear = Number(year) || new Date().getFullYear();

    let salary = null;

    if (salaryId && mongoose.Types.ObjectId.isValid(salaryId)) {
      salary = await Salary.findById(salaryId);
    }

    if (!salary) {
      salary = await Salary.findOne({
        employee: employeeId,
        salaryMonth: payslipMonth,
        salaryYear: payslipYear,
      }).sort({ createdAt: -1 });
    }

    const normalized = normalizeSalaryValues({ baseSalary, bonuses, deductions });

    if (!salary) {
      if (!normalized.baseSalary) {
        return res.status(400).json({ message: 'Base salary is required for new payslip generation' });
      }

      salary = new Salary({
        employee: employeeId,
        employeeName: employee.name,
        employeeEmail: employee.email,
        ...normalized,
        salaryMonth: payslipMonth,
        salaryYear: payslipYear,
      });
    } else if (baseSalary !== undefined || bonuses !== undefined || deductions !== undefined) {
      salary.baseSalary = normalized.baseSalary || salary.baseSalary;
      salary.bonuses = baseSalary !== undefined || bonuses !== undefined ? normalized.bonuses : salary.bonuses;
      salary.deductions =
        baseSalary !== undefined || deductions !== undefined ? normalized.deductions : salary.deductions;
      salary.totalSalary = salary.baseSalary + salary.bonuses - salary.deductions;
    }

    const settings = await resolvePayslipSettings();
    const selectedTemplate = pickTemplate(settings, templateId || salary.templateId);

    salary.templateId = selectedTemplate.id;
    salary.templateName = selectedTemplate.name;
    salary.salaryMonth = payslipMonth;
    salary.salaryYear = payslipYear;
    salary.generatedAt = new Date();
    salary.generatedBy = req.user?._id;
    salary.payslipStatus = 'generated';
    salary.payslipSnapshot = {
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      companyEmail: settings.companyEmail,
      companyPhone: settings.companyPhone,
      logoData: settings.logoData,
      signatureData: settings.signatureData,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      footerNote: settings.footerNote,
    };

    await salary.save();

    const payslipHtml = generatePayslipHtml({
      salary,
      employee,
      settings: salary.payslipSnapshot,
      template: selectedTemplate,
    });

    if (sendByEmail) {
      await sendEmail(employee.email, `Payslip - ${salary.salaryMonth}/${salary.salaryYear}`, payslipHtml);
      salary.emailedAt = new Date();
      await salary.save();
    }

    return res.status(200).json({
      message: sendByEmail
        ? 'Payslip generated and emailed successfully'
        : 'Payslip generated successfully',
      salary,
      payslipHtml,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error generating payslip', error: err.message });
  }
};

export const sendPayslipEmail = async (req, res) => {
  try {
    const { salaryId } = req.params;

    if (!salaryId || !mongoose.Types.ObjectId.isValid(salaryId)) {
      return res.status(400).json({ message: 'Invalid salary ID' });
    }

    const salary = await Salary.findById(salaryId);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    const employee = await Employee.findById(salary.employee);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const template = {
      id: salary.templateId,
      name: salary.templateName,
      accentStyle: 'classic',
    };

    const settings = salary.payslipSnapshot?.companyName
      ? salary.payslipSnapshot
      : (await resolvePayslipSettings()).toObject();

    const payslipHtml = generatePayslipHtml({ salary, employee, settings, template });
    await sendEmail(employee.email, `Payslip - ${salary.salaryMonth}/${salary.salaryYear}`, payslipHtml);

    salary.emailedAt = new Date();
    await salary.save();

    return res.status(200).json({ message: 'Payslip emailed successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error sending payslip email', error: err.message });
  }
};

export const getPayslipHtmlBySalaryId = async (req, res) => {
  try {
    const { salaryId } = req.params;

    if (!salaryId || !mongoose.Types.ObjectId.isValid(salaryId)) {
      return res.status(400).json({ message: 'Invalid salary ID' });
    }

    const salary = await Salary.findById(salaryId);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    if (req.user.role === 'employee' && req.user._id !== String(salary.employee)) {
      return res.status(403).json({ message: 'You can only access your own payslip' });
    }

    const employee = await Employee.findById(salary.employee);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const template = {
      id: salary.templateId,
      name: salary.templateName,
      accentStyle: 'classic',
    };

    const settings = salary.payslipSnapshot?.companyName
      ? salary.payslipSnapshot
      : (await resolvePayslipSettings()).toObject();

    const payslipHtml = generatePayslipHtml({ salary, employee, settings, template });

    return res.status(200).json({ message: 'Payslip fetched successfully', payslipHtml });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching payslip html', error: error.message });
  }
};

// Get all salaries
export const getAllSalaries = async (req, res) => {
  try {
    const salaries = await Salary.find()
      .populate('employee', 'name email')
      .sort({ paymentDate: -1, createdAt: -1 });
    return res.status(200).json({ message: 'Salaries fetched successfully', salaries });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching salaries', error: err.message });
  }
};

// Get salary by employee
export const getSalaryByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (req.user.role === 'employee' && req.user._id !== employeeId) {
      return res.status(403).json({ message: 'You can only access your own salary records' });
    }

    const salaries = await Salary.find({ employee: employeeId }).sort({ paymentDate: -1, createdAt: -1 });
    if (!salaries || salaries.length === 0) {
      return res.status(404).json({ message: 'No salary records found for this employee' });
    }

    return res.status(200).json({ message: 'Salaries fetched successfully', salaries });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching salaries', error: err.message });
  }
};

export const getMyPayslips = async (req, res) => {
  try {
    const salaries = await Salary.find({ employee: req.user._id, payslipStatus: 'generated' }).sort({
      salaryYear: -1,
      salaryMonth: -1,
      createdAt: -1,
    });

    return res.status(200).json({ message: 'Payslips fetched successfully', salaries });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching payslips', error: error.message });
  }
};

// Update salary by ID
export const updateSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const { baseSalary, bonuses, deductions, effectiveFrom, revisionReason } = req.body;

    const salary = await Salary.findById(salaryId);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    const parsedBase = parseMoneyField(baseSalary, { field: 'Base salary', min: 1 });
    const parsedBonuses = parseMoneyField(bonuses, { field: 'Bonuses', min: 0 });
    const parsedDeductions = parseMoneyField(deductions, { field: 'Deductions', min: 0 });
    const parsedEffectiveFrom = parseEffectiveDate(effectiveFrom);
    const parsedReason = sanitizeReason(revisionReason);
    const firstError = [
      parsedBase.error,
      parsedBonuses.error,
      parsedDeductions.error,
      parsedEffectiveFrom.error,
      parsedReason.error,
    ].find(Boolean);
    if (firstError) {
      return res.status(400).json({ message: firstError });
    }

    if (parsedBase.value !== undefined) salary.baseSalary = parsedBase.value;
    if (parsedBonuses.value !== undefined) salary.bonuses = parsedBonuses.value;
    if (parsedDeductions.value !== undefined) salary.deductions = parsedDeductions.value;
    if (parsedEffectiveFrom.value !== undefined) salary.effectiveFrom = parsedEffectiveFrom.value;
    if (parsedReason.value !== undefined) salary.revisionReason = parsedReason.value;
    salary.totalSalary = salary.baseSalary + salary.bonuses - salary.deductions;

    await salary.save();

    return res.status(200).json({ message: 'Salary updated successfully', salary });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating salary', error: err.message });
  }
};

// Delete salary by ID
export const deleteSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;

    const salary = await Salary.findByIdAndDelete(salaryId);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    return res.status(200).json({ message: 'Salary record deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting salary', error: err.message });
  }
};

// Get salary deductions
export const getSalaryDeductions = async (req, res) => {
  try {
    const { salaryId } = req.params;

    const salary = await Salary.findById(salaryId);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    return res.status(200).json({
      message: 'Salary deductions fetched successfully',
      deductions: {
        lateComingDeductions: salary.lateComingDeductions,
        absenceDeductions: salary.absenceDeductions,
        totalDeductions: salary.deductions,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching salary deductions', error: err.message });
  }
};

// Add salary with deductions
export const addSalaryWithDeductions = async (req, res) => {
  try {
    const { employeeId, baseSalary, bonuses = 0, workingDaysInMonth } = req.body;

    const parsedBase = parseMoneyField(baseSalary, { field: 'Base salary', required: true, min: 1 });
    const parsedBonuses = parseMoneyField(bonuses, { field: 'Bonuses', min: 0 });
    const parsedWorkingDays = Number(workingDaysInMonth);
    if (parsedBase.error || parsedBonuses.error) {
      return res.status(400).json({ message: parsedBase.error || parsedBonuses.error });
    }
    if (!Number.isFinite(parsedWorkingDays) || parsedWorkingDays <= 0) {
      return res.status(400).json({ message: 'Working days in month must be greater than 0' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const startDate = new Date(new Date().setDate(1));
    const endDate = new Date(new Date().setMonth(new Date().getMonth() + 1, 0));

    const attendances = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    let lateComingDeductions = 0;
    const absences = parsedWorkingDays - attendances.length;

    attendances.forEach(record => {
      if (record.checkInTime) {
        const checkInHour = new Date(record.checkInTime).getHours();
        const lateBy = Math.max(0, checkInHour - 9);
        lateComingDeductions += lateBy * 10;
      }
    });

    const absenceDeductions = (parsedBase.value / parsedWorkingDays) * absences;
    const totalDeductions = lateComingDeductions + absenceDeductions;

    const salary = new Salary({
      employee: employeeId,
      employeeName: employee.name,
      employeeEmail: employee.email,
      baseSalary: parsedBase.value,
      bonuses: parsedBonuses.value ?? 0,
      deductions: totalDeductions,
      lateComingDeductions,
      absenceDeductions,
      totalSalary: parsedBase.value + (parsedBonuses.value ?? 0) - totalDeductions,
      salaryMonth: new Date().getMonth() + 1,
      salaryYear: new Date().getFullYear(),
    });

    await salary.save();

    return res.status(201).json({ message: 'Salary with deductions added successfully', salary });
  } catch (err) {
    return res.status(500).json({ message: 'Error adding salary with deductions', error: err.message });
  }
};
