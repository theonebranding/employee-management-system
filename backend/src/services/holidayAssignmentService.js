import HolidayTemplate from '../models/holidayTemplateSchema.js';
import TemplateAssignment from '../models/templateAssignmentSchema.js';
import HolidayCredit from '../models/holidayCreditSchema.js';
import Employee from '../models/employeeSchema.js';

/**
 * Build a structured error compatible with the project's error-handling
 * convention used throughout the holiday-template-restructuring spec:
 * plain Error objects carrying `status`, `code`, and `message`.
 */
const makeError = (status, code, message) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};

/**
 * Bulk-assign a Holiday_Template to a list of employees.
 *
 * Idempotency is delivered by the compound unique index on
 * `{ template, employee }` in TemplateAssignment - we attempt the insert and
 * catch the MongoServerError 11000 duplicate-key error, rather than
 * pre-checking (which would race).
 *
 * For `floating` templates, each newly created assignment also issues one
 * `HolidayCredit` (status `available`) per holiday entry on the template.
 *
 * Validates: Requirements 2.1, 2.2, 2.4
 *
 * @param {string} templateId
 * @param {string[]} employeeIds
 * @param {string} adminId
 * @returns {Promise<{ created: string[], skipped: string[] }>}
 */
const bulkAssign = async (templateId, employeeIds, adminId) => {
  const template = await HolidayTemplate.findById(templateId);
  if (!template) {
    throw makeError(404, 'TEMPLATE_NOT_FOUND', 'holiday template not found');
  }

  const ids = Array.isArray(employeeIds) ? employeeIds : [];

  // Single round-trip existence check for all candidate employees.
  const foundCount = await Employee.countDocuments({ _id: { $in: ids } });
  if (foundCount !== ids.length) {
    throw makeError(400, 'EMPLOYEE_NOT_FOUND', 'one or more employees not found');
  }

  const created = [];
  const skipped = [];

  for (const employeeId of ids) {
    try {
      await TemplateAssignment.create({
        template: templateId,
        employee: employeeId,
        assignedBy: adminId,
        assignedAt: Date.now(),
      });

      // Only floating templates issue Holiday_Credits (Requirement 2.4).
      if (template.type === 'floating' && template.holidays.length > 0) {
        const creditDocs = template.holidays.map((holiday) => ({
          employee: employeeId,
          template: templateId,
          sourceHolidayId: holiday._id,
          year: template.year,
          status: 'available',
        }));
        await HolidayCredit.insertMany(creditDocs);
      }

      created.push(employeeId);
    } catch (err) {
      // The compound unique index (template, employee) raises a duplicate
      // key error when an assignment already exists - that's the idempotent
      // skip path (Requirement 2.2).
      if (err && err.code === 11000) {
        skipped.push(employeeId);
        continue;
      }
      throw err;
    }
  }

  return { created, skipped };
};

/**
 * Remove a single Template_Assignment.
 *
 * For `floating` templates, the employee's `available` credits for this
 * template transition to `forfeited` (Requirement 2.5). Credits already in
 * `redeemed`, `expired`, or `forfeited` are left untouched.
 *
 * Validates: Requirements 2.3, 2.5
 *
 * @param {string} templateId
 * @param {string} employeeId
 * @param {string} _adminId  - currently unused at the model layer; reserved
 *                             for future audit columns
 * @returns {Promise<{ unassigned: true, forfeitedCount: number }>}
 */
// eslint-disable-next-line no-unused-vars
const unassign = async (templateId, employeeId, _adminId) => {
  const assignment = await TemplateAssignment.findOne({
    template: templateId,
    employee: employeeId,
  });
  if (!assignment) {
    throw makeError(404, 'ASSIGNMENT_NOT_FOUND', 'template assignment not found');
  }

  // We need the template type to know whether floating credits exist for
  // this (template, employee) pair.
  const template = await HolidayTemplate.findById(templateId).select('type').lean();

  await TemplateAssignment.deleteOne({ _id: assignment._id });

  let forfeitedCount = 0;
  if (template && template.type === 'floating') {
    const result = await HolidayCredit.updateMany(
      {
        template: templateId,
        employee: employeeId,
        status: 'available',
      },
      {
        $set: {
          status: 'forfeited',
          forfeitedAt: new Date(),
        },
      }
    );
    forfeitedCount = result.modifiedCount ?? result.nModified ?? 0;
  }

  return { unassigned: true, forfeitedCount };
};

/**
 * List all Template_Assignments for a given template, populating the
 * employee with the fields the admin assignment view needs.
 *
 * Validates: Requirements 1.5, 9.1
 *
 * @param {string} templateId
 * @returns {Promise<Array>}
 */
const listAssignmentsForTemplate = async (templateId) => {
  return TemplateAssignment.find({ template: templateId })
    .populate('employee', '_id name email employeeCode')
    .lean();
};

/**
 * List all Template_Assignments for a given employee, populating the
 * template. Used by the employee-side read view.
 *
 * Validates: Requirements 1.5, 9.1
 *
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
const listAssignmentsForEmployee = async (employeeId) => {
  return TemplateAssignment.find({ employee: employeeId })
    .populate('template')
    .lean();
};

export {
  bulkAssign,
  unassign,
  listAssignmentsForTemplate,
  listAssignmentsForEmployee,
};
