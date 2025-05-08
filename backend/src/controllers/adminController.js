import Admin from '../models/adminSchema.js';
import AdminAttendanceSettings from '../models/adminAttendanceSettingsSchema.js';
import bcrypt from 'bcrypt';

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
