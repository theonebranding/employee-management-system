import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const optionalReportText = z
  .string()
  .trim()
  .max(5000, 'Report text must be 5000 characters or less')
  .optional();

const optionalAdminComment = z
  .string()
  .trim()
  .max(5000, 'Admin comment must be 5000 characters or less')
  .optional();

export const createDailyReportSchema = z
  .object({
    report: optionalReportText,
  })
  .strict();

export const updateOwnDailyReportSchema = z
  .object({
    report: optionalReportText,
  })
  .strict()
  .refine((data) => data.report !== undefined, {
    message: 'At least one field is required',
  });

export const updateDailyReportByAdminSchema = z
  .object({
    report: optionalReportText,
    adminComment: optionalAdminComment,
  })
  .strict()
  .refine((data) => data.report !== undefined || data.adminComment !== undefined, {
    message: 'At least one field is required',
  });

export const reportIdParamSchema = z
  .object({
    reportId: z.string().regex(objectIdRegex, 'Invalid report ID').optional(),
  })
  .strict();

export const requiredReportIdParamSchema = z
  .object({
    reportId: z.string().regex(objectIdRegex, 'Invalid report ID'),
  })
  .strict();

export const employeeIdParamSchema = z
  .object({
    employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID'),
  })
  .strict();

const listQueryBaseSchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    employee: z.string().regex(objectIdRegex, 'Invalid employee ID').optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(['filled', 'na']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();

const withDateRangeValidation = (schema) =>
  schema.refine(
    (data) =>
      !(data.startDate && data.endDate) || data.startDate.getTime() <= data.endDate.getTime(),
    {
      message: 'startDate must be earlier than or equal to endDate',
      path: ['startDate'],
    }
  );

export const listDailyReportsQuerySchema = withDateRangeValidation(listQueryBaseSchema);

export const listEmployeeReportsQuerySchema = withDateRangeValidation(
  listQueryBaseSchema.omit({ employee: true })
);
