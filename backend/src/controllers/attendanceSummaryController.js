import Attendance from '../models/attendanceSchema.js';
import Employee from '../models/employeeSchema.js';
import SelectedHoliday from '../models/selectedHolidaySchema.js';
import Salary from '../models/salarySchema.js';
import mongoose from 'mongoose';

// Get Daily Attendance
export const getDailyAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const formattedDate = new Date(date).toISOString().split('T')[0];

    // Get all employees count
    const totalEmployees = await Employee.countDocuments();

    const summary = await Attendance.aggregate([
      { $match: { date: new Date(formattedDate) } },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeDetails',
        },
      },
      { $unwind: '$employeeDetails' },
      {
        $project: {
          employeeName: '$employeeDetails.name',
          employeeEmail: '$employeeDetails.email',
          employeeId: '$employeeDetails._id',
          employeeCode: '$employeeDetails.employeeCode',
          checkInTime: { $ifNull: ['$checkInTime', 'N/A'] },
          checkInLocation: { $ifNull: ['$checkInLocation', 'N/A'] },
          checkOutTime: { $ifNull: ['$checkOutTime', 'N/A'] },
          checkOutLocation: { $ifNull: ['$checkOutLocation', 'N/A'] },
          totalWorkTime: { $ifNull: ['$totalWorkingTime', 0] },
          totalRecessDuration: { $ifNull: ['$totalRecessDuration', 0] },
          currentStatus: { $ifNull: ['$currentStatus', 'Unknown'] },
          lateCheckIn: { $ifNull: ['$lateCheckIn', false] },
          halfDay: { $ifNull: ['$halfDay', false] },
        },
      },
    ]);

    const present = summary.length; // Since summary only returns present employees
    const absent = totalEmployees - present;
    const late = summary.filter((emp) => emp.lateCheckIn).length;

    res.status(200).json({
      message: 'Daily attendance fetched successfully',
      totalEmployees,
      present,
      absent,
      late,
      summary,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching daily attendance', error: err.message });
  }
};

// Get Monthly Attendance
export const getMonthlyAttendance = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ message: 'Employee ID, month, and year are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid Employee ID' });
    }

    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

    // Fetch attendance records
    const records = await Attendance.find({
      employee: new mongoose.Types.ObjectId(employeeId),
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: 1 });

    // Calculate total working hours using stored totalWorkingTime
    const totalWorkHours =
      records.reduce((total, record) => total + (record.totalWorkingTime || 0), 0) / 60;

    // Format records to include check-in and check-out locations
    const formattedRecords = records.map((record) => ({
      _id: record._id,
      date: record.date,
      checkInTime: record.checkInTime,
      checkInLocation: record.checkInLocation || 'N/A',
      checkOutTime: record.checkOutTime || 'N/A',
      checkOutLocation: record.checkOutLocation || 'N/A',
      totalWorkingTime: record.totalWorkingTime || 0,
      totalRecessDuration: record.totalRecessDuration || 0,
    }));

    res.status(200).json({
      message: 'Monthly attendance fetched successfully',
      totalWorkHours: `${totalWorkHours} hours`,
      records: formattedRecords,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching monthly attendance', error: err.message });
  }
};

// Get Absentee List
export const getAbsenteeList = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Parse dates in dd-mm-yyyy format
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0); // Ensure midnight for accurate comparison
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    // Adjust end date to include the entire day
    end.setHours(23, 59, 59, 999);

    // Step 1: Fetch all employees
    const allEmployees = await Employee.find({}, '_id name email employeeCode');

    // Step 2: Fetch attendance records within the date range
    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: end },
    });

    // Extract IDs of employees who **checked in** (only check-in matters, checkout ignored)
    const presentEmployeeIds = new Set(
      attendanceRecords
        .filter((record) => record.checkInTime) // Consider employee present if they checked in
        .map((record) => record.employee.toString())
    );

    // Step 3: Fetch holiday records (Only for the requested date range)
    const holidayRecords = await SelectedHoliday.find({
      'selectedHolidays.date': { $gte: start, $lte: end },
    });

    // Extract employees **who have a holiday** in this range
    const holidayEmployeeIds = new Set();
    holidayRecords.forEach((record) => {
      const isOnHoliday = record.selectedHolidays.some(
        (holiday) => holiday.date >= start && holiday.date <= end
      );
      if (isOnHoliday) {
        holidayEmployeeIds.add(record.employee.toString());
      }
    });

    // Step 4: Filter employees who are **absent** (not present and not on holiday)
    const absentEmployees = allEmployees.filter(
      (emp) =>
        !presentEmployeeIds.has(emp._id.toString()) && // Not present
        !holidayEmployeeIds.has(emp._id.toString()) // Not on holiday
    );

    res.status(200).json({
      message: 'Absentee list fetched successfully',
      totalAbsent: absentEmployees.length,
      absentEmployees,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching absentee list', error: err.message });
  }
};

// absentee list of a specific employee and then deduction
export const getEmployeeAbsenteeList = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Fetch employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Fetch salary information
    const salary = await Salary.findOne({ employee: employeeId });
    if (!salary) {
      return res.status(404).json({ message: 'Salary information not found for employee' });
    }

    // Parse dates in dd-mm-yyyy format
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Force UTC
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    // Get current date at start of day for consistent comparison
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Adjust end date to be either the requested end date or current date, whichever is earlier
    const effectiveEndDate = new Date(Math.min(end.getTime(), currentDate.getTime()));
    effectiveEndDate.setHours(23, 59, 59, 999);

    // Calculate total days in the month
    const totalDaysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

    // Calculate daily salary using salary schema
    const dailySalary = salary.baseSalary / totalDaysInMonth;

    // Helper function to format date to YYYY-MM-DD for comparison
    const formatDateForComparison = (date) => date.toISOString().split('T')[0];

    // Generate all working dates (Excluding Sundays)
    const getWorkingDates = (start, end) => {
      const dates = [];
      const current = new Date(start);
      while (current <= end) {
        if (current.getUTCDay() !== 0) {
          // Exclude Sundays
          dates.push(new Date(current));
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
      return dates;
    };

    const workingDates = getWorkingDates(start, effectiveEndDate);

    // Fetch employee-specific holidays
    const selectedHolidayData = await SelectedHoliday.findOne({ employee: employeeId });

    // Create a Set of holiday dates in YYYY-MM-DD format
    const holidayDatesSet = new Set(
      selectedHolidayData
        ? selectedHolidayData.selectedHolidays.map((holiday) =>
            formatDateForComparison(new Date(holiday.date))
          )
        : []
    );

    // Fetch attendance records
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: start, $lte: effectiveEndDate },
    });

    // console.log("Attendance Records:", attendanceRecords); // DEBUG LOG

    // Create a set of attended dates where check-in exists (no need for check-out)
    const attendedDatesSet = new Set(
      attendanceRecords
        .filter((record) => record.checkInTime) // Only check-in matters
        .map((record) => formatDateForComparison(new Date(record.date))) // Convert to YYYY-MM-DD
    );

    // console.log("Attended Dates Set:", attendedDatesSet); // DEBUG LOG

    // Calculate absent dates (Ensure only days without check-in are marked as absent)
    const absentDates = workingDates.filter((date) => {
      const formattedDate = formatDateForComparison(date);
      return (
        !attendedDatesSet.has(formattedDate) && // Not attended (no check-in)
        !holidayDatesSet.has(formattedDate)
      ); // Not a holiday
    });

    // console.log("Absent Dates:", absentDates); // DEBUG LOG

    // Format absent dates
    const formattedAbsentDates = absentDates.map((date) => ({
      date: date,
      formattedDate: date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    }));

    // Calculate total deduction
    const totalAbsents = formattedAbsentDates.length;
    const totalDeduction = totalAbsents * dailySalary;

    res.status(200).json({
      message: 'Absentee list and deductions fetched successfully',
      employeeId,
      employeeName: employee.name,
      baseSalary: salary.baseSalary,
      dailySalary: dailySalary.toFixed(2),
      totalDaysInMonth,
      totalAbsents,
      totalDeduction: totalDeduction.toFixed(2),
      absentDates: formattedAbsentDates,
    });
  } catch (err) {
    console.error('Error in getEmployeeAbsenteeList:', err);
    res.status(500).json({ message: 'Error fetching absentee list', error: err.message });
  }
};

// present list of employees
export const getPresentList = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Parse dates in dd-mm-yyyy format
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day); // Month is zero-indexed in JavaScript
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    // Adjust end date to include the entire day
    end.setHours(23, 59, 59, 999);

    const allEmployees = await Employee.find({}, '_id name email employeeCode');
    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: end },
    });

    const presentEmployeeIds = new Set(
      attendanceRecords.map((record) => record.employee.toString())
    );
    const presentEmployees = allEmployees.filter((emp) =>
      presentEmployeeIds.has(emp._id.toString())
    );

    res.status(200).json({
      message: 'Present list fetched successfully',
      presentEmployees,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching present list', error: err.message });
  }
};

// Get Half Days of an Employee with deduction
export const getEmployeeHalfDays = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    // Input validation
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Parse dates in dd-mm-yyyy format
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Force UTC
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // Validate parsed dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    // Get current date at start of day
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Adjust end date to be either the requested end date or current date, whichever is earlier
    const effectiveEndDate = new Date(Math.min(end.getTime(), currentDate.getTime()));
    effectiveEndDate.setHours(23, 59, 59, 999);

    // Fetch employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Fetch attendance records where `halfDay: true`
    const halfDayRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: start, $lte: effectiveEndDate },
      halfDay: true, // Only fetch half-day records
    });

    // Format half-day records
    const halfDays = halfDayRecords.map((record) => ({
      date: record.date,
      formattedDate: record.date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      hoursWorked: record.totalWorkingTime ? (record.totalWorkingTime / 60).toFixed(2) : '0', // Convert minutes to hours
    }));

    // Fetch salary information
    const salary = await Salary.findOne({ employee: employeeId });
    if (!salary) {
      return res.status(404).json({ message: 'Salary information not found for employee' });
    }

    // Calculate total days in the month
    const totalDaysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const dailySalary = salary.baseSalary / totalDaysInMonth;

    // Calculate deductions
    const totalHalfDays = halfDays.length;
    const totalDeduction = (totalHalfDays * dailySalary) / 2; // Half day = half daily salary

    res.status(200).json({
      message: 'Half days data fetched successfully',
      employeeId,
      employeeName: employee.name,
      baseSalary: salary.baseSalary,
      dailySalary: dailySalary.toFixed(2),
      totalDaysInMonth,
      totalHalfDays,
      totalDeduction: totalDeduction.toFixed(2),
      halfDayDetails: halfDays,
    });
  } catch (err) {
    console.error('Error in getEmployeeHalfDays:', err);
    res.status(500).json({ message: 'Error fetching half days data', error: err.message });
  }
};

//get average working hours of of all employees by days of week
export const getAverageWorkingHoursByDayOfWeek = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use dd-mm-yyyy.' });
    }

    end.setHours(23, 59, 59, 999);

    // Fetch attendance records within the date range
    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: end },
    }).populate('employee', 'name email');

    const workingHoursByDay = {};
    const employeeCountByDay = {};

    // Map to store only the latest working hours per employee per day
    const uniqueEmployeeWorkHours = new Map();

    attendanceRecords.forEach((record) => {
      const dayOfWeek = record.date.getDay();
      const employeeId = record.employee._id.toString();
      const workingHours = (record.totalWorkingTime || 0) / 60; // Convert minutes to hours

      if (!workingHoursByDay[dayOfWeek]) {
        workingHoursByDay[dayOfWeek] = {};
        employeeCountByDay[dayOfWeek] = new Set();
      }

      // Store only the latest working hours per employee per day
      if (!uniqueEmployeeWorkHours.has(`${dayOfWeek}-${employeeId}`)) {
        uniqueEmployeeWorkHours.set(`${dayOfWeek}-${employeeId}`, workingHours);
        workingHoursByDay[dayOfWeek][employeeId] = workingHours;
        employeeCountByDay[dayOfWeek].add(employeeId);
      }
    });

    const daysOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const averageWorkingHours = daysOfWeek.map((day, index) => {
      const totalEmployees = employeeCountByDay[index] ? employeeCountByDay[index].size : 0;
      const totalWorkingHours = Object.values(workingHoursByDay[index] || {}).reduce(
        (acc, cur) => acc + cur,
        0
      );

      return {
        day,
        averageWorkingHours: totalEmployees
          ? (totalWorkingHours / totalEmployees).toFixed(2)
          : '0.00',
        totalWorkingHours: totalWorkingHours.toFixed(2), // Now correctly converted to hours
        totalEmployees,
      };
    });

    res.status(200).json({
      message: 'Average working hours by day of week fetched successfully',
      averageWorkingHours,
    });
  } catch (err) {
    console.error('Error in getAverageWorkingHoursByDayOfWeek:', err);
    res
      .status(500)
      .json({ message: 'Error fetching average working hours by day of week', error: err.message });
  }
};
