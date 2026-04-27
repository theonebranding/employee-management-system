import Admin from '../models/adminSchema.js';
import AdminAttendanceSettings from '../models/adminAttendanceSettingsSchema.js';
import PayslipSettings from '../models/payslipSettingsSchema.js';
import PayrollSettings from '../models/payrollSettingsSchema.js';
import EmployeeMasterOptions from '../models/employeeMasterOptionsSchema.js';
import bcrypt from 'bcrypt';
import { getDefaultPayslipSettings } from '../utils/payslipUtils.js';

// Update Admin Profile
export const updateAdminProfile = async (req, res) => {
  try {
    const { _id } = req.user;
    const updateFields = req.body;

    if (!updateFields || Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const restrictedFields = ['otp', 'otpExpires', 'role', '_id', 'isVerified', 'createdAt'];
    const updates = Object.keys(updateFields).reduce((acc, field) => {
      if (!restrictedFields.includes(field)) {
        acc[field] = updateFields[field];
      }
      return acc;
    }, {});

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      _id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-isVerified -otp -otpExpires -createdAt -updatedAt -role -password');

    if (!updatedAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.status(200).json({
      message: 'Admin data updated successfully',
      admin: updatedAdmin,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating admin data', error: err.message });
  }
};

//  update Admin password
export const updatePassword = async (req, res) => {
  try {
    const { _id } = req.user;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const admin = await Admin.findById(_id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
};

// Get Admin Profile
export const getAdminProfile = async (req, res) => {
  try {
    const { _id } = req.user;

    const admin = await Admin.findById(_id).select(
      '-isVerified -otp -otpExpires -createdAt -updatedAt -role -password'
    );

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.status(200).json({
      message: 'Admin data fetched successfully',
      admin,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching admin data', error: err.message });
  }
};

export const getAttendanceSettings = async (req, res) => {
  try {
    let settings = await AdminAttendanceSettings.findOne();

    // If no settings exist, create default settings
    if (!settings) {
      settings = new AdminAttendanceSettings();
      await settings.save();
    }

    res.status(200).json({ message: 'Attendance settings fetched successfully', settings });
  } catch (error) {
    console.error('Error fetching attendance settings:', error);
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
  }
};

export const updateAttendanceSettings = async (req, res) => {
  try {
    const { lateByMinutes, totalWorkingHours, halfDayHours, minAbsentHours } = req.body;

    let settings = await AdminAttendanceSettings.findOne();

    if (!settings) {
      settings = new AdminAttendanceSettings();
    }

    // Directly save the received values (already in minutes)
    if (lateByMinutes !== undefined) settings.lateByMinutes = lateByMinutes;
    if (totalWorkingHours !== undefined) settings.totalWorkingHours = totalWorkingHours;
    if (halfDayHours !== undefined) settings.halfDayHours = halfDayHours;
    if (minAbsentHours !== undefined) settings.minAbsentHours = minAbsentHours;

    await settings.save();
    res.status(200).json({ message: 'Attendance settings updated successfully', settings });
  } catch (error) {
    console.error('Error updating attendance settings:', error);
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
};

export const getPayslipSettings = async (req, res) => {
  try {
    let settings = await PayslipSettings.findOne();

    if (!settings) {
      settings = new PayslipSettings(getDefaultPayslipSettings());
      await settings.save();
    }

    res.status(200).json({ message: 'Payslip settings fetched successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payslip settings', error: error.message });
  }
};

export const updatePayslipSettings = async (req, res) => {
  try {
    let settings = await PayslipSettings.findOne();
    if (!settings) {
      settings = new PayslipSettings(getDefaultPayslipSettings());
    }

    const allowedFields = [
      'companyName',
      'companyAddress',
      'companyEmail',
      'companyPhone',
      'logoData',
      'signatureData',
      'primaryColor',
      'secondaryColor',
      'footerNote',
      'activeTemplateId',
      'templates',
    ];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    }

    await settings.save();
    res.status(200).json({ message: 'Payslip settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating payslip settings', error: error.message });
  }
};

export const getPayrollSettings = async (req, res) => {
  try {
    let settings = await PayrollSettings.findOne();

    if (!settings) {
      settings = new PayrollSettings();
      await settings.save();
    }

    res.status(200).json({ message: 'Payroll settings fetched successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payroll settings', error: error.message });
  }
};

export const updatePayrollSettings = async (req, res) => {
  try {
    let settings = await PayrollSettings.findOne();
    if (!settings) {
      settings = new PayrollSettings();
    }

    if (req.body.overtime) {
      settings.overtime = { ...settings.overtime, ...req.body.overtime };
    }

    if (req.body.penalties) {
      const penaltyUpdates = { ...req.body.penalties };
      if (penaltyUpdates.method === 'multiplier') {
        penaltyUpdates.method = 'percentage';
      }
      settings.penalties = { ...settings.penalties, ...penaltyUpdates };
    }

    if (req.body.extras) {
      settings.extras = { ...settings.extras, ...req.body.extras };
    }

    await settings.save();
    res.status(200).json({ message: 'Payroll settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating payroll settings', error: error.message });
  }
};

export const getEmployeeMasterOptions = async (req, res) => {
  try {
    let settings = await EmployeeMasterOptions.findOne();
    if (!settings) {
      settings = new EmployeeMasterOptions();
      await settings.save();
    }

    res.status(200).json({ message: 'Employee master options fetched successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employee master options', error: error.message });
  }
};

export const updateEmployeeMasterOptions = async (req, res) => {
  try {
    let settings = await EmployeeMasterOptions.findOne();
    if (!settings) {
      settings = new EmployeeMasterOptions();
    }

    const sanitizeList = (value, fallback) => {
      if (!Array.isArray(value)) return fallback;
      const cleaned = value
        .map(item => String(item || '').trim())
        .filter(Boolean);
      return cleaned.length ? Array.from(new Set(cleaned)) : fallback;
    };

    if (req.body.departments !== undefined) {
      settings.departments = sanitizeList(req.body.departments, settings.departments);
    }
    if (req.body.designations !== undefined) {
      settings.designations = sanitizeList(req.body.designations, settings.designations);
    }

    await settings.save();
    res.status(200).json({ message: 'Employee master options updated successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating employee master options', error: error.message });
  }
};
