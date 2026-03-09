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

export const addSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    const { baseSalary, bonuses = 0, deductions = 0, salaryMonth, salaryYear } = req.body;

    if (baseSalary === undefined || Number(baseSalary) <= 0) {
      return res.status(400).json({ message: 'Please provide valid base salary' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const normalized = normalizeSalaryValues({ baseSalary, bonuses, deductions });

    const salary = new Salary({
      employee: employeeId,
      employeeName: employee.name,
      employeeEmail: employee.email,
      ...normalized,
      salaryMonth: Number(salaryMonth) || new Date().getMonth() + 1,
      salaryYear: Number(salaryYear) || new Date().getFullYear(),
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
    const { baseSalary, bonuses, deductions } = req.body;

    const salary = await Salary.findById(salaryId);
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    if (baseSalary !== undefined) salary.baseSalary = Number(baseSalary);
    if (bonuses !== undefined) salary.bonuses = Number(bonuses);
    if (deductions !== undefined) salary.deductions = Number(deductions);
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
    const absences = Number(workingDaysInMonth) - attendances.length;

    attendances.forEach(record => {
      if (record.checkInTime) {
        const checkInHour = new Date(record.checkInTime).getHours();
        const lateBy = Math.max(0, checkInHour - 9);
        lateComingDeductions += lateBy * 10;
      }
    });

    const absenceDeductions = (Number(baseSalary) / Number(workingDaysInMonth)) * absences;
    const totalDeductions = lateComingDeductions + absenceDeductions;

    const salary = new Salary({
      employee: employeeId,
      employeeName: employee.name,
      employeeEmail: employee.email,
      baseSalary: Number(baseSalary),
      bonuses: Number(bonuses),
      deductions: totalDeductions,
      lateComingDeductions,
      absenceDeductions,
      totalSalary: Number(baseSalary) + Number(bonuses) - totalDeductions,
      salaryMonth: new Date().getMonth() + 1,
      salaryYear: new Date().getFullYear(),
    });

    await salary.save();

    return res.status(201).json({ message: 'Salary with deductions added successfully', salary });
  } catch (err) {
    return res.status(500).json({ message: 'Error adding salary with deductions', error: err.message });
  }
};
