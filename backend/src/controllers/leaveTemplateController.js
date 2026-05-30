import LeaveTemplate from '../models/leaveTemplateSchema.js';
import LeaveTemplateAssignment from '../models/leaveTemplateAssignmentSchema.js';
import Employee from '../models/employeeSchema.js';
import { getTemplateBalance } from '../utils/leaveTemplateUtils.js';

const parseTemplateDate = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const createLeaveTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      autoAllocationCount,
      autoAllocationPeriod,
      carryForwardCount,
      carryForwardPeriod,
      effectiveDate,
      encashmentAllowed,
      requiresDocument,
      autoApprove,
      countAsPaidLeave,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Template name is required.' });
    }

    const parsedEffectiveDate = parseTemplateDate(effectiveDate, new Date());
    if (!parsedEffectiveDate) {
      return res.status(400).json({ message: 'Effective date is invalid.' });
    }

    const template = await LeaveTemplate.create({
      name,
      description: description || '',
      autoAllocationCount: Number(autoAllocationCount || 0),
      autoAllocationPeriod: autoAllocationPeriod || 'monthly',
      carryForwardCount: Number(carryForwardCount || 0),
      carryForwardPeriod: carryForwardPeriod || 'monthly',
      effectiveDate: parsedEffectiveDate,
      encashmentAllowed: Boolean(encashmentAllowed),
      requiresDocument: Boolean(requiresDocument),
      autoApprove: autoApprove === undefined ? true : Boolean(autoApprove),
      countAsPaidLeave: countAsPaidLeave === undefined ? true : Boolean(countAsPaidLeave),
    });

    return res.status(201).json({ message: 'Leave template created', template });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating leave template', error: error.message });
  }
};

export const getLeaveTemplates = async (req, res) => {
  try {
    const templates = await LeaveTemplate.find().sort({ createdAt: -1 });
    return res.status(200).json({ message: 'Leave templates fetched', templates });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching leave templates', error: error.message });
  }
};

export const updateLeaveTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    if (updates.effectiveDate !== undefined) {
      const parsedEffectiveDate = parseTemplateDate(updates.effectiveDate, null);
      if (!parsedEffectiveDate) {
        return res.status(400).json({ message: 'Effective date is invalid.' });
      }
      updates.effectiveDate = parsedEffectiveDate;
    }

    const template = await LeaveTemplate.findByIdAndUpdate(templateId, updates, {
      new: true,
      runValidators: true,
    });

    if (!template) {
      return res.status(404).json({ message: 'Leave template not found' });
    }

    return res.status(200).json({ message: 'Leave template updated', template });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating leave template', error: error.message });
  }
};

export const deleteLeaveTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await LeaveTemplate.findByIdAndDelete(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Leave template not found' });
    }

    await LeaveTemplateAssignment.deleteMany({ template: templateId });

    return res.status(200).json({ message: 'Leave template deleted', template });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting leave template', error: error.message });
  }
};

export const assignLeaveTemplate = async (req, res) => {
  try {
    const { templateId, employeeIds } = req.body;

    if (!templateId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'Template and employee list are required.' });
    }

    const template = await LeaveTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Leave template not found' });
    }

    const employees = await Employee.find({ _id: { $in: employeeIds } }).select('_id');

    const assignments = await Promise.all(
      employees.map((employee) =>
        LeaveTemplateAssignment.findOneAndUpdate(
          { employee: employee._id },
          { template: template._id, assignedAt: new Date() },
          { new: true, upsert: true }
        )
      )
    );

    return res.status(200).json({ message: 'Template assigned', assignments });
  } catch (error) {
    return res.status(500).json({ message: 'Error assigning template', error: error.message });
  }
};

export const getEmployeesWithTemplate = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [employees, total] = await Promise.all([
      Employee.find()
        .select('_id name employeeCode department designation')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Employee.countDocuments(),
    ]);

    const assignments = await LeaveTemplateAssignment.find({
      employee: { $in: employees.map((emp) => emp._id) },
    }).populate('template', 'name');

    const assignmentMap = new Map(
      assignments.map((assignment) => [
        String(assignment.employee),
        assignment.template?.name || null,
      ])
    );

    const data = employees.map((emp) => ({
      _id: emp._id,
      employeeCode: emp.employeeCode,
      name: emp.name,
      department: emp.department || '—',
      designation: emp.designation || '—',
      templateAssigned: assignmentMap.get(String(emp._id)) || '—',
    }));

    return res.status(200).json({
      message: 'Employees fetched',
      employees: data,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
};

export const getMyLeaveTemplate = async (req, res) => {
  try {
    const assignment = await LeaveTemplateAssignment.findOne({ employee: req.user._id }).populate(
      'template'
    );

    if (!assignment?.template) {
      return res.status(404).json({ message: 'No leave template assigned yet.' });
    }

    const balance = await getTemplateBalance({
      employeeId: req.user._id,
      template: assignment.template,
    });

    return res.status(200).json({
      message: 'Leave template fetched',
      assignment: {
        _id: assignment._id,
        assignedAt: assignment.assignedAt,
      },
      template: assignment.template,
      balance,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching leave template', error: error.message });
  }
};

export const getEmployeeLeaveTemplate = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required.' });
    }

    const assignment = await LeaveTemplateAssignment.findOne({ employee: employeeId }).populate(
      'template'
    );

    if (!assignment?.template) {
      return res.status(404).json({ message: 'No leave template assigned yet.' });
    }

    const balance = await getTemplateBalance({
      employeeId,
      template: assignment.template,
    });

    return res.status(200).json({
      message: 'Leave template fetched',
      assignment: {
        _id: assignment._id,
        assignedAt: assignment.assignedAt,
      },
      template: assignment.template,
      balance,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching leave template', error: error.message });
  }
};
