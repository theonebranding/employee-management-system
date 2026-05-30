import HolidayTemplate from '../models/holidayTemplateSchema.js';
import TemplateAssignment from '../models/templateAssignmentSchema.js';
import HolidayCredit from '../models/holidayCreditSchema.js';
import { toIstDate } from '../utils/timezoneUtils.js';

const VALID_TEMPLATE_TYPES = ['fixed', 'floating'];

/**
 * Build a plain Error with the `{ status, code, message }` shape the controllers
 * expect to surface to the API layer.
 */
const buildServiceError = (status, code, message) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};

const assertValidTemplateType = (type) => {
  if (!VALID_TEMPLATE_TYPES.includes(type)) {
    throw buildServiceError(
      400,
      'TEMPLATE_INVALID_TYPE',
      `Template type must be one of ${VALID_TEMPLATE_TYPES.join(', ')}`
    );
  }
};

/**
 * Throws `TEMPLATE_HOLIDAY_OUT_OF_YEAR` (400) on the first holiday whose date,
 * evaluated in IST, falls outside the template's calendar year.
 *
 * Validates: Requirements 1.3
 */
export const validateHolidayDatesAgainstYear = (year, holidays = []) => {
  if (!Array.isArray(holidays)) {
    return;
  }

  const numericYear = Number(year);
  for (const holiday of holidays) {
    if (!holiday || holiday.date === undefined || holiday.date === null) {
      throw buildServiceError(
        400,
        'TEMPLATE_HOLIDAY_OUT_OF_YEAR',
        `Holiday "${holiday?.name ?? '(unnamed)'}" is missing a date`
      );
    }

    const parsed = new Date(holiday.date);
    if (Number.isNaN(parsed.getTime())) {
      throw buildServiceError(
        400,
        'TEMPLATE_HOLIDAY_OUT_OF_YEAR',
        `Holiday "${holiday.name ?? '(unnamed)'}" has an invalid date`
      );
    }

    const istYear = toIstDate(parsed).getUTCFullYear();
    if (istYear !== numericYear) {
      throw buildServiceError(
        400,
        'TEMPLATE_HOLIDAY_OUT_OF_YEAR',
        `Holiday "${holiday.name ?? '(unnamed)'}" on ${parsed.toISOString()} is not in template year ${numericYear}`
      );
    }
  }
};

/**
 * Throws `TEMPLATE_TYPE_CHANGE_BLOCKED` (409) when a template already has any
 * `TemplateAssignment` or any `HolidayCredit` referencing it. Locking the type
 * prevents a `fixed`/`floating` flip from invalidating existing credits or
 * payroll history.
 *
 * Validates: Requirements 1.2
 */
export const assertTypeChangeAllowed = async (templateId) => {
  const [hasAssignment, hasCredit] = await Promise.all([
    TemplateAssignment.exists({ template: templateId }),
    HolidayCredit.exists({ template: templateId }),
  ]);

  if (hasAssignment || hasCredit) {
    throw buildServiceError(
      409,
      'TEMPLATE_TYPE_CHANGE_BLOCKED',
      'Template type cannot be changed once assignments or credits exist for it'
    );
  }
};

/**
 * Create a HolidayTemplate. Validates `type` and that every holiday date falls
 * inside the template's IST calendar year. `createdBy` and `updatedBy` are both
 * stamped with `adminId`.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */
export const createTemplate = async ({ name, description, year, type, holidays = [], adminId }) => {
  assertValidTemplateType(type);
  validateHolidayDatesAgainstYear(year, holidays);

  const template = await HolidayTemplate.create({
    name,
    description,
    year,
    type,
    holidays,
    createdBy: adminId,
    updatedBy: adminId,
  });

  return template;
};

/**
 * Update an existing HolidayTemplate. Re-runs the same validations as
 * `createTemplate`. If the incoming `type` differs from the persisted value,
 * `assertTypeChangeAllowed` runs first so a flip on a template that already has
 * assignments or credits is rejected with `TEMPLATE_TYPE_CHANGE_BLOCKED`.
 *
 * Validates: Requirements 1.2, 1.3, 1.4
 */
export const updateTemplate = async (
  templateId,
  { name, description, year, type, holidays = [], adminId }
) => {
  const existing = await HolidayTemplate.findById(templateId);
  if (!existing) {
    throw buildServiceError(404, 'TEMPLATE_NOT_FOUND', `Holiday template ${templateId} not found`);
  }

  assertValidTemplateType(type);
  validateHolidayDatesAgainstYear(year, holidays);

  if (existing.type !== type) {
    await assertTypeChangeAllowed(templateId);
  }

  existing.name = name;
  existing.description = description;
  existing.year = year;
  existing.type = type;
  existing.holidays = holidays;
  existing.updatedBy = adminId;

  await existing.save();
  return existing;
};

/**
 * Delete a HolidayTemplate. Rejected with `TEMPLATE_HAS_ASSIGNMENTS` (409) if
 * any TemplateAssignment exists for it; the message includes the live count so
 * the admin UI can surface it.
 *
 * Validates: Requirements 1.6, 1.7
 */
export const deleteTemplate = async (templateId) => {
  const assignmentCount = await TemplateAssignment.countDocuments({ template: templateId });
  if (assignmentCount > 0) {
    throw buildServiceError(
      409,
      'TEMPLATE_HAS_ASSIGNMENTS',
      `Holiday template has active assignments and cannot be deleted; assignmentCount=${assignmentCount}`
    );
  }

  const removed = await HolidayTemplate.findByIdAndDelete(templateId);
  if (!removed) {
    throw buildServiceError(404, 'TEMPLATE_NOT_FOUND', `Holiday template ${templateId} not found`);
  }

  return { deleted: true };
};

/**
 * Return all templates matching the optional `{ year, type }` filter, each
 * decorated with the live `assignmentCount`. Sorted by year (desc) and then
 * creation order so the newest year surfaces first.
 *
 * Validates: Requirements 1.5
 */
export const listTemplates = async ({ year, type } = {}) => {
  const filter = {};
  if (year !== undefined && year !== null && year !== '') {
    const numericYear = Number(year);
    if (Number.isFinite(numericYear)) {
      filter.year = numericYear;
    }
  }
  if (type) {
    filter.type = type;
  }

  const templates = await HolidayTemplate.find(filter).sort({ year: -1, createdAt: -1 }).lean();
  if (templates.length === 0) {
    return [];
  }

  const counts = await Promise.all(
    templates.map((template) => TemplateAssignment.countDocuments({ template: template._id }))
  );

  return templates.map((template, index) => ({
    ...template,
    assignmentCount: counts[index],
  }));
};

/**
 * Return a single template plus its live `assignmentCount`. Throws
 * `TEMPLATE_NOT_FOUND` (404) if the id does not match a record.
 *
 * Validates: Requirements 1.5
 */
export const getTemplate = async (templateId) => {
  const template = await HolidayTemplate.findById(templateId).lean();
  if (!template) {
    throw buildServiceError(404, 'TEMPLATE_NOT_FOUND', `Holiday template ${templateId} not found`);
  }

  const assignmentCount = await TemplateAssignment.countDocuments({ template: templateId });
  return { ...template, assignmentCount };
};
