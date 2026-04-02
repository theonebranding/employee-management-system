import Attendance from '../models/attendanceSchema.js';
import Employee from '../models/employeeSchema.js';
import LateCheckIn from '../models/lateCheckInSchema.js';
import AdminAttendanceSettings from '../models/adminAttendanceSettingsSchema.js';
import DailyReport from '../models/dailyReportSchema.js';
import SelectedHoliday from '../models/selectedHolidaySchema.js';
import { getStartOfUtcDay, getUtcDayKey, normalizeReportText } from '../utils/dailyReportUtils.js';

const toRadians = (degrees) => (Number(degrees) * Math.PI) / 180;

const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const normalizeIp = (value = '') => {
  if (!value) return '';
  const ip = String(value).trim();
  return ip.startsWith('::ffff:') ? ip.replace('::ffff:', '') : ip;
};

const extractClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const [first] = forwarded.split(',');
    return normalizeIp(first);
  }
  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
};

const isIpAllowed = (clientIp, allowedIps = []) => {
  if (!clientIp) return false;
  if (!Array.isArray(allowedIps) || allowedIps.length === 0) return false;
  return allowedIps.map((ip) => normalizeIp(ip)).includes(normalizeIp(clientIp));
};

const validateAttendanceAccessPolicy = ({ req, latitude, longitude, settings }) => {
  if (!settings) return null;

  if (settings.ipAllowlistEnabled) {
    const clientIp = extractClientIp(req);
    if (!isIpAllowed(clientIp, settings.allowedIps)) {
      return `Attendance access blocked for IP ${clientIp || 'unknown'}. Contact admin to update allowlist.`;
    }
  }

  if (settings.geoFenceEnabled) {
    const officeLat = Number(settings.officeLatitude);
    const officeLng = Number(settings.officeLongitude);
    const radius = Number(settings.geoFenceRadiusMeters || 0);

    if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng) || !radius) {
      return 'Geo-fence policy is enabled but office coordinates are not configured';
    }

    const distance = haversineDistanceMeters(officeLat, officeLng, Number(latitude), Number(longitude));
    if (distance > radius) {
      return `You are outside allowed office geo-fence. Distance ${Math.round(distance)}m exceeds ${radius}m.`;
    }
  }

  return null;
};

// Fetch Current Attendance Status
export const getCurrentStatus = async (req, res) => {
  try {
    const { _id: employeeId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    // Find today's attendance record
    const attendance = await Attendance.findOne({ employee: employeeId, date: today });

    if (!attendance) {
      return res
        .status(404)
        .json({ message: 'No attendance record found for today, Please check in for today' });
    }

    const now = new Date();

    // Fetch latitude and longitude
    const { latitude, longitude } = attendance.checkInLocation || {};
    const { latitude: checkOutLatitude, longitude: checkOutLongitude } =
      attendance.checkOutLocation || {};

    // Calculate total working time live
    let liveWorkingTime = 0;
    if (attendance.checkInTime && !attendance.isRecess) {
      liveWorkingTime =
        (attendance.checkOutTime || now) -
        attendance.checkInTime -
        (attendance.totalRecessDuration || 0);
    }

    const totalRecessDurationInMilliseconds = attendance.totalRecessDuration || 0;

    // Format time as hours, minutes, and seconds
    const formatTime = (milliseconds) => {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours} hours ${minutes} minutes ${seconds} seconds`;
    };

    // Determine the current status
    let status = 'Checked Out';
    if (attendance.checkInTime && !attendance.checkOutTime) {
      status = attendance.isRecess ? 'In Recess' : 'Checked In';
    }

    // Fetch late check-in information
    const lateCheckIn = attendance.lateCheckIn || false;
    // const lateCheckInMinutes = attendance.lateCheckInMinutes || 0;

    // Response
    const response = {
      status,
      checkInTime: attendance.checkInTime || null,
      checkInLocation: latitude && longitude ? { latitude, longitude } : null,
      checkOutTime: attendance.checkOutTime || null,
      checkOutLocation:
        checkOutLatitude && checkOutLongitude
          ? { latitude: checkOutLatitude, longitude: checkOutLongitude }
          : null,
      recessStartTime: attendance.recessStartTime || null,
      totalRecessDuration: formatTime(totalRecessDurationInMilliseconds),
      liveWorkingTime: formatTime(liveWorkingTime),
      lateCheckIn,
    };

    res.status(200).json({
      message: 'Current attendance status fetched successfully',
      data: response,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching current status', error: err.message });
  }
};

export const checkIn = async (req, res) => {
  try {
    const { _id: employeeId, email: employeeEmail } = req.user;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Prevent multiple check-ins
    const existingAttendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (existingAttendance) {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    // Validate and extract latitude and longitude from request body
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Verify latitude and longitude are within valid ranges
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Invalid latitude or longitude values' });
    }

    const accessPolicySettings = await AdminAttendanceSettings.findOne();
    const policyViolation = validateAttendanceAccessPolicy({
      req,
      latitude: lat,
      longitude: lng,
      settings: accessPolicySettings,
    });
    if (policyViolation) {
      return res.status(403).json({ message: policyViolation });
    }

    // Fetch employee's predefined check-in time (already stored in UTC)
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const predefinedCheckInTimeUTC = employee.predefinedCheckInTime; // Example: "03:30"
    if (!predefinedCheckInTimeUTC) {
      return res.status(400).json({ message: 'No predefined check-in time found' });
    }

    // Convert predefined check-in time (HH:mm) to a full UTC Date object
    const [predefinedHour, predefinedMinute] = predefinedCheckInTimeUTC.split(':').map(Number);
    const now = new Date(); // Current timestamp in UTC
    const predefinedTimeUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        predefinedHour,
        predefinedMinute,
        0,
        0
      )
    ); // Ensures the predefined check-in time is a full UTC date

    const actualCheckInTimeUTC = new Date(); // Check-in time is already in UTC

    // Calculate delay in minutes
    const delayInMinutes = Math.floor((actualCheckInTimeUTC - predefinedTimeUTC) / (1000 * 60));

    // Determine if the employee is late from AdminAttendanceSettings
    const settings = await AdminAttendanceSettings.findOne();
    if (!settings) {
      return res.status(400).json({ message: 'Admin attendance settings not found' });
    }

    const lateByMinutes = settings.lateByMinutes || 20;
    const isLate = delayInMinutes > lateByMinutes;

    if (isLate) {
      const lateCheckIn = new LateCheckIn({
        employee: employeeId,
        employeeEmail,
        date: today,
        lateByMinutes: delayInMinutes,
        predefinedCheckInTime: predefinedTimeUTC.toISOString(),
        actualCheckInTime: actualCheckInTimeUTC.toISOString(),
      });
      await lateCheckIn.save();
    }

    // Save attendance record with geolocation
    const attendance = new Attendance({
      employee: employeeId,
      employeeEmail,
      date: today,
      checkInTime: actualCheckInTimeUTC.toISOString(),
      checkInLocation: {
        latitude: lat,
        longitude: lng,
      },
      lateCheckIn: isLate,
      currentStatus: 'Checked In',
    });

    await attendance.save();

    res.status(200).json({
      message: 'Check-in successful',
      attendance,
      lateCheckIn: isLate ? `Late by ${delayInMinutes} minutes` : 'On time',
      lateByMinutes: delayInMinutes,
    });
  } catch (err) {
    console.error('Check-in Error:', err);
    res.status(500).json({ message: 'Error during check-in', error: err.message });
  }
};

// Start Recess API
export const startRecess = async (req, res) => {
  try {
    const { _id: employeeId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({ message: 'Cannot start recess without checking in first' });
    }

    if (attendance.isRecess) {
      return res.status(400).json({ message: 'Recess is already ongoing' });
    }

    attendance.isRecess = true;
    attendance.recessStartTime = new Date();
    attendance.currentStatus = 'In Recess';

    await attendance.save();
    res.status(200).json({ message: 'Recess started', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Error during recess start', error: err.message });
  }
};

// End Recess API
export const endRecess = async (req, res) => {
  try {
    const { _id: employeeId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (!attendance || !attendance.isRecess) {
      return res.status(400).json({ message: 'No ongoing recess to end' });
    }

    const now = new Date();
    const recessDuration = now - new Date(attendance.recessStartTime);

    attendance.totalRecessDuration = (attendance.totalRecessDuration || 0) + recessDuration;
    attendance.isRecess = false;
    attendance.recessStartTime = null;
    attendance.currentStatus = 'Checked In';

    await attendance.save();
    res.status(200).json({ message: 'Recess ended', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Error during recess end', error: err.message });
  }
};

// Check-Out API
export const checkOut = async (req, res) => {
  try {
    const { _id: employeeId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({ message: 'Cannot check out without checking in first' });
    }

    if (attendance.isRecess) {
      return res.status(400).json({ message: 'Cannot check out during an ongoing recess' });
    }

    // Validate and extract latitude and longitude from request body
    const { latitude, longitude, dailyReport } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Verify latitude and longitude are within valid ranges
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Invalid latitude or longitude values' });
    }

    const policyViolation = validateAttendanceAccessPolicy({
      req,
      latitude: lat,
      longitude: lng,
      settings: await AdminAttendanceSettings.findOne(),
    });
    if (policyViolation) {
      return res.status(403).json({ message: policyViolation });
    }

    attendance.checkOutTime = new Date();
    attendance.currentStatus = 'Checked Out';
    attendance.checkOutLocation = {
      latitude: lat,
      longitude: lng,
    };

    // Calculate total working time in minutes
    const totalWorkingTimeInMinutes = Math.floor(
      (attendance.checkOutTime - attendance.checkInTime - (attendance.totalRecessDuration || 0)) /
        60000
    );
    attendance.totalWorkingTime = totalWorkingTimeInMinutes; // Save total working time in minutes to database

    // Fetch half-day threshold from Admin Attendance Settings
    const settings = await AdminAttendanceSettings.findOne();
    const halfDayThreshold = settings?.halfDayHours || 300; // Default to 300 minutes if not set

    // If total working time is less than the required full-time hours but more than half-day threshold, mark it as a half-day
    if (
      totalWorkingTimeInMinutes < settings.totalWorkingHours &&
      totalWorkingTimeInMinutes > halfDayThreshold
    ) {
      attendance.halfDay = true;
    }

    const normalizedReport = normalizeReportText(dailyReport);
    const hasDailyReportPayload = Object.prototype.hasOwnProperty.call(req.body, 'dailyReport');
    const existingDailyReport = await DailyReport.findOne({
      employee: employeeId,
      dayKey: getUtcDayKey(),
    });

    if (!existingDailyReport) {
      await DailyReport.create({
        employee: employeeId,
        dayKey: getUtcDayKey(),
        reportDate: getStartOfUtcDay(),
        reportText: hasDailyReportPayload ? normalizedReport : 'N/A',
        createdBy: employeeId,
        createdByRole: req.user.role,
        updatedBy: employeeId,
        updatedByRole: req.user.role,
      });
    } else if (hasDailyReportPayload) {
      existingDailyReport.reportText = normalizedReport;
      existingDailyReport.updatedBy = employeeId;
      existingDailyReport.updatedByRole = req.user.role;
      await existingDailyReport.save();
    }

    await attendance.save();

    // Format total working time as hours and minutes for response
    const hours = Math.floor(totalWorkingTimeInMinutes / 60);
    const minutes = totalWorkingTimeInMinutes % 60;
    const totalWorkingTimeFormatted = `${hours} hours ${minutes} minutes`;

    res.status(200).json({
      message: 'Check-out successful',
      attendance,
      totalWorkingTime: totalWorkingTimeFormatted,
    });
  } catch (err) {
    console.error('Error during check-out:', err);
    res.status(500).json({ message: 'Error during check-out', error: err.message });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.attendanceId || req.body.attendanceId;
    const { checkInTime, checkOutTime, totalRecessDuration } = req.body;

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (checkInTime) attendance.checkInTime = new Date(checkInTime);
    if (checkOutTime) attendance.checkOutTime = new Date(checkOutTime);
    if (totalRecessDuration !== undefined) attendance.totalRecessDuration = totalRecessDuration;

    // Recalculate totalWorkingTime if check-out and check-in times exist
    if (attendance.checkOutTime && attendance.checkInTime) {
      attendance.totalWorkingTime =
        attendance.checkOutTime - attendance.checkInTime - (attendance.totalRecessDuration || 0);
    }

    await attendance.save();

    res.status(200).json({ message: 'Attendance record updated successfully', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Error updating attendance', error: err.message });
  }
};

export const getMonthlyAbsenceDays = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const requestedEmployeeId = req.query.employeeId || req.user._id;

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month and year are required' });
    }

    if (req.user.role === 'employee' && requestedEmployeeId !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only access your own absence history' });
    }

    const employee = await Employee.findById(requestedEmployeeId).select('_id name email');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const attendanceRecords = await Attendance.find({
      employee: requestedEmployeeId,
      date: { $gte: start, $lte: end },
      checkInTime: { $ne: null },
    }).select('date');

    const selectedHoliday = await SelectedHoliday.findOne({ employee: requestedEmployeeId }).select(
      'selectedHolidays'
    );

    const presentDays = new Set(
      attendanceRecords.map((record) => new Date(record.date).toISOString().split('T')[0])
    );

    const holidayDays = new Set(
      (selectedHoliday?.selectedHolidays || [])
        .map((holiday) => new Date(holiday.date))
        .filter((holidayDate) => holidayDate >= start && holidayDate <= end)
        .map((holidayDate) => holidayDate.toISOString().split('T')[0])
    );

    const absentDays = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const dayOfWeek = cursor.getUTCDay();
      const dateKey = cursor.toISOString().split('T')[0];
      const isSunday = dayOfWeek === 0;

      if (!isSunday && !holidayDays.has(dateKey) && !presentDays.has(dateKey)) {
        absentDays.push(dateKey);
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return res.status(200).json({
      message: 'Absent days fetched successfully',
      employeeId: employee._id,
      employeeName: employee.name,
      month,
      year,
      totalAbsentDays: absentDays.length,
      absentDays,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching absent days', error: error.message });
  }
};
