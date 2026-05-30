import express from 'express';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  assignTemplate,
  unassignTemplate,
  listTemplateAssignments,
  listEmployeeCredits,
  cancelRedemptionAdmin,
  getEmployeesOnHolidayHandler,
  getMyTemplates,
  redeemMyCredit,
  cancelMyRedemption,
} from '../controllers/holidayController.js';
import verifyToken from '../middleware/verifyToken.js';
import checkRole from '../middleware/checkRole.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Mixed-role routes (admin + employee). Registered before admin-only routes
// so that the literal `/me/...` segments are matched before any path that
// shares the same prefix. The controller enforces Requirement 5.3 by
// rejecting redeem calls whose role is not `employee`.
// ---------------------------------------------------------------------------

router.get('/me/templates', verifyToken, checkRole(['admin', 'employee']), getMyTemplates); // List templates assigned to the calling employee with credit summaries
router.post(
  '/me/credits/:creditId/redeem',
  verifyToken,
  checkRole(['admin', 'employee']),
  redeemMyCredit
); // Redeem an available floating credit on a target date (employee-only inside controller)
router.post(
  '/me/credits/:creditId/cancel-redemption',
  verifyToken,
  checkRole(['admin', 'employee']),
  cancelMyRedemption
); // Employee self-cancel of a previous redemption (rejected when payroll month is locked)

// ---------------------------------------------------------------------------
// Admin-only routes. Literal `/employees-on-holiday` is registered before
// the parameterized `/employees/:employeeId/credits` to avoid any future
// shadowing if Express ever loosens its segment matching.
// ---------------------------------------------------------------------------

router.get(
  '/employees-on-holiday',
  verifyToken,
  checkRole(['admin']),
  getEmployeesOnHolidayHandler
); // List employees on holiday for a date, range, or month+year

router.get(
  '/employees/:employeeId/credits',
  verifyToken,
  checkRole(['admin']),
  listEmployeeCredits
); // Admin view of one employee's holiday credits grouped by template

router.post(
  '/credits/:creditId/cancel-redemption',
  verifyToken,
  checkRole(['admin']),
  cancelRedemptionAdmin
); // Admin-initiated cancel of a redeemed credit (rejected when payroll month is locked)

router.post('/templates', verifyToken, checkRole(['admin']), createTemplate); // Create a new Holiday_Template
router.get('/templates', verifyToken, checkRole(['admin']), listTemplates); // List Holiday_Templates with optional year/type filters and assignment counts
router.get('/templates/:templateId', verifyToken, checkRole(['admin']), getTemplate); // Fetch a single Holiday_Template by id
router.put('/templates/:templateId', verifyToken, checkRole(['admin']), updateTemplate); // Update Holiday_Template fields (rejects type change once assignments/credits exist)
router.delete('/templates/:templateId', verifyToken, checkRole(['admin']), deleteTemplate); // Delete a Holiday_Template (rejects when active assignments exist)

router.post(
  '/templates/:templateId/assign',
  verifyToken,
  checkRole(['admin']),
  assignTemplate
); // Bulk-assign a template to a list of employee ids; idempotent on duplicates
router.get(
  '/templates/:templateId/assignments',
  verifyToken,
  checkRole(['admin']),
  listTemplateAssignments
); // List employees this template is currently assigned to (for the click-through view)
router.delete(
  '/templates/:templateId/assignments/:employeeId',
  verifyToken,
  checkRole(['admin']),
  unassignTemplate
); // Remove a single employee's assignment; floating templates forfeit available credits

export default router;
