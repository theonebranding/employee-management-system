import Attendance from '../models/attendanceSchema.js';
import AttendanceRegularization from '../models/attendanceRegularizationSchema.js';
import Employee from '../models/employeeSchema.js';
import RotaAssignment from '../models/rotaAssignmentSchema.js';
import ShiftTemplate from '../models/shiftTemplateSchema.js';

export const createShiftTemplate = async (req, res) => {
  try {
    const payload = req.body;
    const shiftTemplate = await ShiftTemplate.create(payload);
    return res.status(201).json({ message: 'Shift template created successfully', shiftTemplate });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating shift template', error: error.message });
  }
};

export const listShiftTemplates = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const shiftTemplates = await ShiftTemplate.find(filters).sort({ name: 1 });
    return res.status(200).json({ message: 'Shift templates fetched successfully', shiftTemplates });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching shift templates', error: error.message });
  }
};

export const assignRota = async (req, res) => {
  try {
    const { employeeId, shiftTemplateId, effectiveFrom, effectiveTo, notes = '' } = req.body;

    const [employee, shiftTemplate] = await Promise.all([
      Employee.findById(employeeId).select('_id'),
      ShiftTemplate.findById(shiftTemplateId).select('_id'),
    ]);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (!shiftTemplate) {
      return res.status(404).json({ message: 'Shift template not found' });
    }

    const assignment = await RotaAssignment.create({
      employee: employeeId,
      shiftTemplate: shiftTemplateId,
      effectiveFrom,
      effectiveTo,
      assignedBy: req.user?._id || null,
      notes,
    });

    return res.status(201).json({ message: 'Rota assigned successfully', assignment });
  } catch (error) {
    return res.status(500).json({ message: 'Error assigning rota', error: error.message });
  }
};

export const listRotaAssignments = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    const filters = {};

    if (employeeId) {
      filters.employee = employeeId;
    }

    if (month && year) {
      const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999));
      filters.effectiveFrom = { $lte: end };
      filters.effectiveTo = { $gte: start };
    }

    const assignments = await RotaAssignment.find(filters)
      .sort({ effectiveFrom: -1 })
      .populate('employee', 'name email department team location')
      .populate('shiftTemplate')
      .populate('assignedBy', 'name email');

    return res.status(200).json({ message: 'Rota assignments fetched successfully', assignments });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching rota assignments', error: error.message });
  }
};

export const createAttendanceRegularization = async (req, res) => {
  try {
    const {
      attendanceId = null,
      date,
      requestedCheckInTime = null,
      requestedCheckOutTime = null,
      reason,
    } = req.body;

    const employeeId = req.user._id;
    let linkedAttendance = null;

    if (attendanceId) {
      linkedAttendance = await Attendance.findById(attendanceId).select('_id employee date');
      if (!linkedAttendance) {
        return res.status(404).json({ message: 'Attendance record not found' });
      }
      if (String(linkedAttendance.employee) !== String(employeeId)) {
        return res.status(403).json({ message: 'You can only regularize your own attendance' });
      }
    }

    const regularization = await AttendanceRegularization.create({
      employee: employeeId,
      attendance: linkedAttendance?._id || null,
      date,
      requestedCheckInTime,
      requestedCheckOutTime,
      reason,
      status: 'pending',
    });

    return res
      .status(201)
      .json({ message: 'Attendance regularization request created successfully', regularization });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error creating attendance regularization', error: error.message });
  }
};

export const listAttendanceRegularizations = async (req, res) => {
  try {
    const { employeeId, status, month, year } = req.query;
    const filters = {};

    if (status) filters.status = status;

    if (req.user.role === 'employee') {
      filters.employee = req.user._id;
    } else if (employeeId) {
      filters.employee = employeeId;
    }

    if (month && year) {
      filters.date = {
        $gte: new Date(Date.UTC(Number(year), Number(month) - 1, 1, 0, 0, 0, 0)),
        $lte: new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999)),
      };
    }

    const regularizations = await AttendanceRegularization.find(filters)
      .sort({ createdAt: -1 })
      .populate('employee', 'name email department team location')
      .populate('attendance')
      .populate('decidedBy', 'name email');

    return res.status(200).json({ message: 'Regularization requests fetched successfully', regularizations });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching regularization requests', error: error.message });
  }
};

export const decideAttendanceRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, decisionNote = '' } = req.body;

    const request = await AttendanceRegularization.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Regularization request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be updated' });
    }

    request.status = status;
    request.decisionNote = decisionNote;
    request.decidedBy = req.user._id;
    request.decidedAt = new Date();

    if (status === 'approved' && request.attendance) {
      const attendance = await Attendance.findById(request.attendance);
      if (attendance) {
        if (request.requestedCheckInTime) attendance.checkInTime = request.requestedCheckInTime;
        if (request.requestedCheckOutTime) attendance.checkOutTime = request.requestedCheckOutTime;

        if (attendance.checkInTime && attendance.checkOutTime) {
          attendance.totalWorkingTime = Math.max(
            0,
            Math.floor(
              (new Date(attendance.checkOutTime).getTime() - new Date(attendance.checkInTime).getTime()) /
                60000
            )
          );
        }

        await attendance.save();
      }
    }

    await request.save();

    return res.status(200).json({ message: 'Regularization request updated successfully', request });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error updating regularization request', error: error.message });
  }
};
