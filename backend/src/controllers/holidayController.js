import * as holidayTemplateService from '../services/holidayTemplateService.js';
import * as holidayAssignmentService from '../services/holidayAssignmentService.js';
import * as holidayCreditService from '../services/holidayCreditService.js';
import * as holidayPayrollService from '../services/holidayPayrollService.js';

/**
 * Translate a caught error into the project-wide JSON error response shape.
 * Service errors carry `{ status, code, message }`; anything else is treated
 * as an internal server error and logged.
 */
const sendError = (res, err, contextLabel) => {
  if (err && err.status && err.code) {
    return res.status(err.status).json({
      message: err.message,
      code: err.code,
    });
  }

  // Unexpected error - log full details server-side, surface a generic 500.
  console.error(`[holidayController] ${contextLabel} failed:`, err);
  return res.status(500).json({
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

// ---------------------------------------------------------------------------
// Admin handlers
// ---------------------------------------------------------------------------

/**
 * POST /holidays/templates
 * Create a new Holiday_Template owned by the calling admin.
 *
 * Validates: Requirements 1.1
 */
export const createTemplate = async (req, res) => {
  try {
    const template = await holidayTemplateService.createTemplate({
      ...req.body,
      adminId: req.user._id,
    });
    return res.status(201).json({
      message: 'Holiday template created successfully',
      template,
    });
  } catch (err) {
    return sendError(res, err, 'createTemplate');
  }
};

/**
 * GET /holidays/templates
 * List all Holiday_Templates with optional `year` and `type` filters.
 *
 * Validates: Requirements 1.5
 */
export const listTemplates = async (req, res) => {
  try {
    const templates = await holidayTemplateService.listTemplates({
      year: req.query.year,
      type: req.query.type,
    });
    return res.status(200).json({
      message: 'Holiday templates fetched successfully',
      templates,
    });
  } catch (err) {
    return sendError(res, err, 'listTemplates');
  }
};

/**
 * GET /holidays/templates/:templateId
 *
 * Validates: Requirements 1.5
 */
export const getTemplate = async (req, res) => {
  try {
    const template = await holidayTemplateService.getTemplate(req.params.templateId);
    return res.status(200).json({
      message: 'Holiday template fetched successfully',
      template,
    });
  } catch (err) {
    return sendError(res, err, 'getTemplate');
  }
};

/**
 * PUT /holidays/templates/:templateId
 *
 * Validates: Requirements 1.4, 1.2, 1.3
 */
export const updateTemplate = async (req, res) => {
  try {
    const template = await holidayTemplateService.updateTemplate(req.params.templateId, {
      ...req.body,
      adminId: req.user._id,
    });
    return res.status(200).json({
      message: 'Holiday template updated successfully',
      template,
    });
  } catch (err) {
    return sendError(res, err, 'updateTemplate');
  }
};

/**
 * DELETE /holidays/templates/:templateId
 * Rejects when any TemplateAssignment exists for the template.
 *
 * Validates: Requirements 1.6, 1.7
 */
export const deleteTemplate = async (req, res) => {
  try {
    const result = await holidayTemplateService.deleteTemplate(req.params.templateId);
    return res.status(200).json({
      message: 'Holiday template deleted successfully',
      ...result,
    });
  } catch (err) {
    return sendError(res, err, 'deleteTemplate');
  }
};

/**
 * POST /holidays/templates/:templateId/assign
 * Bulk-assign a template to a list of employee ids. Idempotent on duplicates.
 *
 * Validates: Requirements 2.1, 2.2, 2.4
 */
export const assignTemplate = async (req, res) => {
  try {
    const { created, skipped } = await holidayAssignmentService.bulkAssign(
      req.params.templateId,
      req.body.employeeIds,
      req.user._id
    );
    return res.status(200).json({
      message: 'Template assignment processed',
      created,
      skipped,
    });
  } catch (err) {
    return sendError(res, err, 'assignTemplate');
  }
};

/**
 * DELETE /holidays/templates/:templateId/assignments/:employeeId
 * Unassign a single employee. For floating templates, available credits flip
 * to forfeited (Requirement 2.5).
 *
 * Validates: Requirements 2.3, 2.5
 */
export const unassignTemplate = async (req, res) => {
  try {
    const result = await holidayAssignmentService.unassign(
      req.params.templateId,
      req.params.employeeId,
      req.user._id
    );
    return res.status(200).json({
      message: 'Template assignment removed successfully',
      ...result,
    });
  } catch (err) {
    return sendError(res, err, 'unassignTemplate');
  }
};

/**
 * GET /holidays/templates/:templateId/assignments
 * Admin view of which employees a template is currently assigned to. Drives
 * the click-through from the assignment count column on the templates list.
 */
export const listTemplateAssignments = async (req, res) => {
  try {
    const assignments = await holidayAssignmentService.listAssignmentsForTemplate(
      req.params.templateId
    );
    return res.status(200).json({
      message: 'Template assignments fetched successfully',
      assignments,
    });
  } catch (err) {
    return sendError(res, err, 'listTemplateAssignments');
  }
};

/**
 * GET /holidays/employees/:employeeId/credits
 * Admin-side view of an employee's holiday credits grouped by template.
 *
 * Validates: Requirements 9.3
 */
export const listEmployeeCredits = async (req, res) => {
  try {
    const creditGroups = await holidayCreditService.listCreditsForEmployee(req.params.employeeId);
    return res.status(200).json({
      message: 'Employee holiday credits fetched successfully',
      creditGroups,
    });
  } catch (err) {
    return sendError(res, err, 'listEmployeeCredits');
  }
};

/**
 * POST /holidays/credits/:creditId/cancel-redemption
 * Admin-initiated cancellation of a redeemed credit.
 *
 * Validates: Requirements 5.1, 5.2
 */
export const cancelRedemptionAdmin = async (req, res) => {
  try {
    const credit = await holidayCreditService.cancelRedemption({
      creditId: req.params.creditId,
      actorId: req.user._id,
      actorRole: 'admin',
    });
    return res.status(200).json({
      message: 'Holiday credit redemption cancelled successfully',
      credit,
    });
  } catch (err) {
    return sendError(res, err, 'cancelRedemptionAdmin');
  }
};

/**
 * GET /holidays/employees-on-holiday
 * List employees on holiday for a single date, a date range, or a month/year.
 * Optional `employeeId` query narrows to a single employee.
 *
 * Validates: Requirements 9.1, 9.3
 */
export const getEmployeesOnHolidayHandler = async (req, res) => {
  try {
    const { date, startDate, endDate, month, year, employeeId } = req.query;
    const holidays = await holidayPayrollService.getEmployeesOnHoliday({
      date,
      startDate,
      endDate,
      month,
      year,
      employeeId,
    });
    return res.status(200).json({
      message: 'Employees on holiday fetched successfully',
      holidays,
    });
  } catch (err) {
    return sendError(res, err, 'getEmployeesOnHolidayHandler');
  }
};

// ---------------------------------------------------------------------------
// Employee handlers
// ---------------------------------------------------------------------------

/**
 * GET /holidays/me/templates
 * Returns the assigned templates and credit groups for the calling employee
 * in a single round-trip so the UI can render fixed/floating sections and
 * per-template credit counts together.
 *
 * Validates: Requirements 9.1, 9.3
 */
export const getMyTemplates = async (req, res) => {
  try {
    const [assignments, creditGroups] = await Promise.all([
      holidayAssignmentService.listAssignmentsForEmployee(req.user._id),
      holidayCreditService.listCreditsForEmployee(req.user._id),
    ]);

    const templates = assignments
      .map((assignment) => assignment.template)
      .filter((template) => template !== null && template !== undefined);

    return res.status(200).json({
      message: 'Assigned holiday templates fetched successfully',
      templates,
      creditGroups,
    });
  } catch (err) {
    return sendError(res, err, 'getMyTemplates');
  }
};

/**
 * POST /holidays/me/credits/:creditId/redeem
 * Employee-only endpoint to redeem an `available` credit on `targetDate`.
 *
 * Requirement 5.3 — no actor may redeem on behalf of an employee. The role
 * gate here rejects admins (and any future non-employee role) before the
 * service is even called; ownership is then enforced inside `redeemCredit`.
 *
 * Validates: Requirements 4.1, 5.3
 */
export const redeemMyCredit = async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({
        message: 'Only employees can redeem holiday credits',
        code: 'CREDIT_NOT_OWNED',
      });
    }

    const credit = await holidayCreditService.redeemCredit({
      creditId: req.params.creditId,
      employeeId: req.user._id,
      targetDate: req.body.targetDate,
    });
    return res.status(200).json({
      message: 'Holiday credit redeemed successfully',
      credit,
    });
  } catch (err) {
    return sendError(res, err, 'redeemMyCredit');
  }
};

/**
 * POST /holidays/me/credits/:creditId/cancel-redemption
 * Employee self-cancel; the service enforces ownership via `actorRole`.
 *
 * Validates: Requirements 5.1, 5.2, 9.5
 */
export const cancelMyRedemption = async (req, res) => {
  try {
    const credit = await holidayCreditService.cancelRedemption({
      creditId: req.params.creditId,
      actorId: req.user._id,
      actorRole: 'employee',
    });
    return res.status(200).json({
      message: 'Holiday credit redemption cancelled successfully',
      credit,
    });
  } catch (err) {
    return sendError(res, err, 'cancelMyRedemption');
  }
};
