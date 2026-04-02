import mongoose from 'mongoose';
import SelectedHoliday from '../models/selectedHolidaySchema.js';
import PredefinedHoliday from '../models/predefinedHolidaySchema.js';
import Employee from '../models/employeeSchema.js';
import Leave from '../models/leaveSchema.js';

const toIsoDate = (value) => new Date(value).toISOString().split('T')[0];

// Add Predefined Holidays
export const addPredefinedHoliday = async (req, res) => {
  try {
    const { holidays } = req.body;

    if (!holidays || !Array.isArray(holidays)) {
      return res.status(400).json({ message: 'Invalid input. Expected an array of holidays.' });
    }

    const addedHolidays = [];

    for (const holiday of holidays) {
      const { name, date, location = 'GLOBAL', calendarCode = 'INDIA-GLOBAL', isOptional = false } = holiday;

      if (!name || !date) {
        return res.status(400).json({ message: 'Holiday name and date are required.' });
      }

      // Check if the holiday already exists
      const existingHoliday = await PredefinedHoliday.findOne({ name, date, location });

      if (existingHoliday) {
        continue; // Skip adding duplicate holidays
      }

      // Save the new holiday
      const newHoliday = new PredefinedHoliday({ name, date, location, calendarCode, isOptional });
      await newHoliday.save();
      addedHolidays.push(newHoliday);
    }

    res.status(201).json({
      message: 'Predefined holidays added successfully',
      holidays: addedHolidays,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error adding predefined holidays', error: err.message });
  }
};

// Fetch Predefined Holidays
export const getPredefinedHolidays = async (req, res) => {
  try {
    const { location = 'GLOBAL', year, calendarCode } = req.query;
    const filters = {
      location: { $in: ['GLOBAL', location] },
    };

    if (calendarCode) {
      filters.calendarCode = calendarCode;
    }

    if (year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      filters.date = { $gte: start, $lte: end };
    }

    const holidays = await PredefinedHoliday.find(filters).sort({
      date: 1,
      location: 1,
    });
    res.status(200).json({ message: 'Predefined holidays fetched successfully', holidays });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching predefined holidays', error: err.message });
  }
};

export const listHolidayLocations = async (req, res) => {
  try {
    const [holidayLocations, employeeLocations] = await Promise.all([
      PredefinedHoliday.distinct('location'),
      Employee.distinct('location'),
    ]);

    const merged = [...holidayLocations, ...employeeLocations]
      .map((item) => (item || '').trim())
      .filter(Boolean);
    const locations = Array.from(new Set(['GLOBAL', ...merged])).sort();

    return res.status(200).json({ message: 'Holiday locations fetched successfully', locations });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching holiday locations', error: error.message });
  }
};

export const exportPredefinedHolidays = async (req, res) => {
  try {
    const { location, year, calendarCode, format = 'json' } = req.query;
    const filters = {};

    if (location) {
      filters.location = location;
    }
    if (calendarCode) {
      filters.calendarCode = calendarCode;
    }
    if (year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      filters.date = { $gte: start, $lte: end };
    }

    const holidays = await PredefinedHoliday.find(filters).sort({ date: 1, location: 1 }).lean();

    if (format === 'csv') {
      const rows = [
        'name,date,location,calendarCode,isOptional',
        ...holidays.map((item) =>
          [
            `"${String(item.name || '').replace(/"/g, '""')}"`,
            toIsoDate(item.date),
            item.location || 'GLOBAL',
            item.calendarCode || 'INDIA-GLOBAL',
            item.isOptional ? 'true' : 'false',
          ].join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="holiday-export-${year || 'all'}.csv"`
      );
      return res.status(200).send(rows.join('\n'));
    }

    return res.status(200).json({
      message: 'Predefined holidays exported successfully',
      count: holidays.length,
      holidays: holidays.map((item) => ({
        name: item.name,
        date: toIsoDate(item.date),
        location: item.location || 'GLOBAL',
        calendarCode: item.calendarCode || 'INDIA-GLOBAL',
        isOptional: Boolean(item.isOptional),
      })),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error exporting predefined holidays', error: error.message });
  }
};

export const importPredefinedHolidaysBulk = async (req, res) => {
  try {
    const { holidays } = req.body;
    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({ message: 'holidays array is required' });
    }

    const accepted = [];
    const skipped = [];

    for (const holiday of holidays) {
      const name = (holiday?.name || '').trim();
      const date = holiday?.date;
      const location = (holiday?.location || 'GLOBAL').trim() || 'GLOBAL';
      const calendarCode = (holiday?.calendarCode || 'INDIA-GLOBAL').trim() || 'INDIA-GLOBAL';
      const isOptional = Boolean(holiday?.isOptional);

      if (!name || !date) {
        skipped.push({ holiday, reason: 'name and date are required' });
        continue;
      }

      try {
        const existing = await PredefinedHoliday.findOne({
          name,
          date: new Date(date),
          location,
        }).lean();

        if (existing) {
          skipped.push({ holiday: { name, date, location }, reason: 'duplicate' });
          continue;
        }

        const created = await PredefinedHoliday.create({
          name,
          date,
          location,
          calendarCode,
          isOptional,
        });
        accepted.push(created);
      } catch (entryError) {
        skipped.push({ holiday: { name, date, location }, reason: entryError.message });
      }
    }

    return res.status(201).json({
      message: 'Holiday bulk import processed',
      createdCount: accepted.length,
      skippedCount: skipped.length,
      holidays: accepted,
      skipped,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error importing holidays', error: error.message });
  }
};

// delete predefined holiday
export const deletePredefinedHoliday = async (req, res) => {
  try {
    const { holidayId } = req.params;

    if (!holidayId) {
      return res.status(400).json({ message: 'Holiday ID is required' });
    }

    const deletedHoliday = await PredefinedHoliday.findByIdAndDelete(holidayId);

    if (!deletedHoliday) {
      return res.status(404).json({ message: 'Predefined holiday not found' });
    }

    res.status(200).json({
      message: 'Predefined holiday deleted successfully',
      holiday: deletedHoliday,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting predefined holiday', error: err.message });
  }
};

// select employee holidays
export const selectHolidays = async (req, res) => {
  try {
    const { selectedHolidays, location } = req.body;
    const { _id: employeeId } = req.user; // Employee ID from token

    if (!selectedHolidays || !Array.isArray(selectedHolidays)) {
      return res.status(400).json({ message: 'Invalid data. Expected an array of holidays.' });
    }

    if (selectedHolidays.length > 10) {
      return res.status(400).json({ message: 'You can select a maximum of 10 holidays.' });
    }

    const employee = await Employee.findById(employeeId).select('location');
    const locationContext = location || employee?.location || 'GLOBAL';

    // Save selected holidays
    const updatedHolidays = await SelectedHoliday.findOneAndUpdate(
      { employee: employeeId },
      { selectedHolidays, location: locationContext },
      { new: true, upsert: true } // Create new record if not existing
    );

    res.status(201).json({
      message: 'Holidays selected successfully',
      selectedHolidays: updatedHolidays.selectedHolidays,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error selecting holidays', error: err.message });
  }
};

// fetch employee selected holidays
export const getSelectedHolidays = async (req, res) => {
  try {
    const employeeId = req.params.id || req.user._id;

    // Validate if employeeId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }

    const holidays = await SelectedHoliday.findOne({ employee: employeeId });

    if (!holidays) {
      return res.status(404).json({ message: 'No selected holidays found for this employee' });
    }

    res.status(200).json({
      message: 'Selected holidays fetched successfully',
      holidays: holidays.selectedHolidays,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching selected holidays', error: err.message });
  }
};

// delete custom holiday
export const deleteCustomHoliday = async (req, res) => {
  try {
    const { holidayId } = req.params;
    const { _id: employeeId } = req.user; // Employee ID from token

    if (!holidayId) {
      return res.status(400).json({ message: 'Holiday ID is required' });
    }

    const employeeHolidays = await SelectedHoliday.findOne({ employee: employeeId });

    if (!employeeHolidays) {
      return res.status(404).json({ message: 'No selected holidays found for this employee' });
    }

    // Filter out the holiday to delete
    const updatedHolidays = employeeHolidays.selectedHolidays.filter(
      (holiday) => holiday._id.toString() !== holidayId
    );

    // Save the updated holidays
    employeeHolidays.selectedHolidays = updatedHolidays;
    await employeeHolidays.save();

    res.status(200).json({
      message: 'Custom holiday deleted successfully',
      holidays: employeeHolidays.selectedHolidays,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting custom holiday', error: err.message });
  }
};

// find employee who are on holiday wih various filters
export const getEmployeeOnHoliday = async (req, res) => {
  try {
    const { date, startDate, endDate, month, year, employeeId } = req.query;
    let start, end;

    if (date) {
      start = new Date(date);
      end = new Date(date);
    } else if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (month && year) {
      start = new Date(`${year}-${month}-01`); // First day of the month
      end = new Date(year, month, 0); // Last day of the month
    } else {
      return res.status(400).json({
        message:
          "Invalid parameters. Provide either 'date', 'month & year', or 'startDate & endDate'.",
      });
    }

    // Convert to UTC and remove time part for accurate matching
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    let matchCondition = {
      'selectedHolidays.date': { $gte: start, $lte: end },
    };

    if (employeeId) {
      matchCondition['employee'] = new mongoose.Types.ObjectId(employeeId);
    }

    const holidays = await SelectedHoliday.aggregate([
      { $match: matchCondition },
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
        $addFields: {
          filteredHolidays: {
            $filter: {
              input: '$selectedHolidays',
              as: 'holiday',
              cond: {
                $and: [{ $gte: ['$$holiday.date', start] }, { $lte: ['$$holiday.date', end] }],
              },
            },
          },
        },
      },
      {
        $match: {
          'filteredHolidays.0': { $exists: true }, // Ensures only employees with holidays are returned
        },
      },
      {
        $project: {
          _id: 0, // Remove default MongoDB ID from output
          employeeId: '$employeeDetails._id',
          name: '$employeeDetails.name',
          email: '$employeeDetails.email',
          holiday: '$filteredHolidays',
        },
      },
    ]);

    if (!holidays.length) {
      return res.status(204).json({
        message: 'No employees on holiday for the selected date(s)',
        range: { start, end },
        employeeId: employeeId || null,
      });
    }

    res.status(200).json({
      message: 'Employees on holiday fetched successfully',
      holidays,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employees on holiday', error: err.message });
  }
};

export const checkHolidayLeaveOverlap = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ message: 'employeeId, startDate, and endDate are required' });
    }

    const employee = await Employee.findById(employeeId).select('location');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const [holidays, leaves] = await Promise.all([
      PredefinedHoliday.find({
        date: { $gte: start, $lte: end },
        location: { $in: ['GLOBAL', employee.location || 'GLOBAL'] },
      })
        .select('name date location')
        .lean(),
      Leave.find({
        employee: employeeId,
        status: { $in: ['pending', 'approved'] },
        startDate: { $lte: end },
        endDate: { $gte: start },
      })
        .select('startDate endDate leaveTypeCode status numberOfDays')
        .lean(),
    ]);

    return res.status(200).json({
      message: 'Holiday and leave overlap analysis fetched successfully',
      employeeId,
      location: employee.location || 'GLOBAL',
      period: { startDate: start, endDate: end },
      holidayCount: holidays.length,
      leaveCount: leaves.length,
      holidays,
      leaves,
      hasOverlapRisk: holidays.length > 0 && leaves.length > 0,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error checking holiday overlap', error: error.message });
  }
};
