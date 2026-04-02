import { z } from 'zod';

const reportTypeSchema = z.enum(['executive-kpi', 'attendance', 'leave', 'payroll-variance']);
const frequencySchema = z.enum(['daily', 'weekly', 'monthly']);
const formatSchema = z.enum(['csv', 'xlsx', 'pdf']);

export const executiveKpiQuerySchema = z
  .object({
    month: z.string().trim().optional(),
    year: z.string().trim().optional(),
    department: z.string().trim().optional(),
    location: z.string().trim().optional(),
    managerId: z.string().trim().optional(),
  })
  .strict();

export const executiveDrilldownQuerySchema = z
  .object({
    month: z.string().trim().optional(),
    year: z.string().trim().optional(),
  })
  .strict();

export const executiveTrendsQuerySchema = z
  .object({
    months: z.string().trim().optional(),
  })
  .strict();

export const createScheduledReportSchema = z
  .object({
    name: z.string().trim().min(2).max(140),
    reportType: reportTypeSchema,
    frequency: frequencySchema,
    schedule: z
      .object({
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        dayOfMonth: z.number().int().min(1).max(31).optional(),
        time: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        timezone: z.string().trim().min(2).max(64).optional(),
      })
      .strict(),
    format: formatSchema,
    recipients: z.array(z.string().email()).min(1),
    filters: z
      .object({
        month: z.number().int().min(1).max(12).optional().nullable(),
        year: z.number().int().min(2000).max(2100).optional().nullable(),
        department: z.string().trim().optional().nullable(),
        location: z.string().trim().optional().nullable(),
        managerId: z.string().trim().optional().nullable(),
      })
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const reportIdParamSchema = z
  .object({
    reportId: z.string().trim().min(1),
  })
  .strict();

export const updateScheduledReportSchema = createScheduledReportSchema.partial();
