import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const isoDateTimeOrDateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Date must be a valid ISO date',
  });

export const predefinedHolidayQuerySchema = z
  .object({
    location: z.string().trim().min(1).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    calendarCode: z.string().trim().min(1).optional(),
  })
  .strict();

export const exportPredefinedHolidaysQuerySchema = z
  .object({
    location: z.string().trim().min(1).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    calendarCode: z.string().trim().min(1).optional(),
    format: z.enum(['json', 'csv']).optional(),
  })
  .strict();

const holidayItemSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    date: isoDateSchema,
    location: z.string().trim().min(1).max(80).optional(),
    calendarCode: z.string().trim().min(1).max(80).optional(),
    isOptional: z.boolean().optional(),
  })
  .strict();

export const addPredefinedHolidaysSchema = z
  .object({
    holidays: z.array(holidayItemSchema).min(1).max(1000),
  })
  .strict();

export const importPredefinedHolidaysSchema = addPredefinedHolidaysSchema;

export const holidayIdParamSchema = z
  .object({
    holidayId: z.string().regex(objectIdRegex, 'Invalid holiday ID'),
  })
  .strict();

export const selectedHolidayEmployeeParamSchema = z
  .object({
    id: z.string().regex(objectIdRegex, 'Invalid employee ID').optional(),
  })
  .strict();

const selectedHolidayItemSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    date: isoDateSchema,
    isCustom: z.boolean(),
  })
  .strict();

export const selectHolidaysSchema = z
  .object({
    selectedHolidays: z.array(selectedHolidayItemSchema).min(1).max(10),
    location: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const employeeOnHolidayQuerySchema = z
  .object({
    date: isoDateSchema.optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID').optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const hasDate = Boolean(data.date);
    const hasStartDate = Boolean(data.startDate);
    const hasEndDate = Boolean(data.endDate);
    const hasMonth = data.month !== undefined;
    const hasYear = data.year !== undefined;
    const hasDateRange = hasStartDate || hasEndDate;
    const hasMonthYear = hasMonth || hasYear;

    if (hasDate) {
      if (hasDateRange || hasMonthYear) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['date'],
          message: "Use either 'date' or another date filter, not both",
        });
      }
      return;
    }

    if (hasDateRange) {
      if (!hasStartDate || !hasEndDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startDate'],
          message: 'Both startDate and endDate are required together',
        });
        return;
      }

      if (new Date(data.startDate).getTime() > new Date(data.endDate).getTime()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startDate'],
          message: 'startDate must be earlier than or equal to endDate',
        });
      }

      if (hasMonthYear) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['month'],
          message: "Use either 'startDate/endDate' or 'month/year', not both",
        });
      }
      return;
    }

    if (hasMonthYear) {
      if (!hasMonth || !hasYear) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['month'],
          message: 'Both month and year are required together',
        });
      }
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date'],
      message: 'Provide date, startDate and endDate, or month and year',
    });
  });

export const overlapAnalysisQuerySchema = z
  .object({
    employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID'),
    startDate: isoDateTimeOrDateSchema,
    endDate: isoDateTimeOrDateSchema,
  })
  .strict()
  .refine((data) => new Date(data.startDate).getTime() <= new Date(data.endDate).getTime(), {
    message: 'startDate must be earlier than or equal to endDate',
    path: ['startDate'],
  });
