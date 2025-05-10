import mongoose from 'mongoose';
import SelectedHoliday from '../models/selectedHolidaySchema.js';
import PredefinedHoliday from '../models/predefinedHolidaySchema.js';

// Add Predefined Holidays
export const addPredefinedHoliday = async (req, res) => {
  try {
    const { holidays } = req.body;

    if (!holidays || !Array.isArray(holidays)) {
      return res.status(400).json({ message: 'Invalid input. Expected an array of holidays.' });
    }

    const addedHolidays = [];

    for (const holiday of holidays) {
      const { name, date } = holiday;

      if (!name || !date) {
        return res.status(400).json({ message: 'Holiday name and date are required.' });
      }

      // Check if the holiday already exists
      const existingHoliday = await PredefinedHoliday.findOne({ name, date });

      if (existingHoliday) {
        continue; // Skip adding duplicate holidays
      }

      // Save the new holiday
      const newHoliday = new PredefinedHoliday({ name, date });
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
    const holidays = await PredefinedHoliday.find().sort({ date: 1 });
    res.status(200).json({ message: 'Predefined holidays fetched successfully', holidays });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching predefined holidays', error: err.message });
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
    const { selectedHolidays } = req.body;
    const { _id: employeeId } = req.user; // Employee ID from token

    if (!selectedHolidays || !Array.isArray(selectedHolidays)) {
      return res.status(400).json({ message: 'Invalid data. Expected an array of holidays.' });
    }

    if (selectedHolidays.length > 10) {
      return res.status(400).json({ message: 'You can select a maximum of 10 holidays.' });
    }

    // Save selected holidays
    const updatedHolidays = await SelectedHoliday.findOneAndUpdate(
      { employee: employeeId },
      { selectedHolidays },
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
