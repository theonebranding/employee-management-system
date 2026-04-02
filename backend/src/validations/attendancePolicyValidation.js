import { z } from 'zod';

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createShiftTemplateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    code: z.string().trim().min(2).max(40),
    startTime: z.string().trim().regex(hhmmRegex, 'startTime must be HH:mm'),
    endTime: z.string().trim().regex(hhmmRegex, 'endTime must be HH:mm'),
    graceMinutes: z.number().int().min(0).max(240).optional(),
    minimumMinutesForHalfDay: z.number().int().min(60).max(720).optional(),
    overtimeEligibleAfterMinutes: z.number().int().min(60).max(1440).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const listShiftTemplatesQuerySchema = z
  .object({
    isActive: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const assignRotaSchema = z
  .object({
    employeeId: z.string().trim().min(1),
    shiftTemplateId: z.string().trim().min(1),
    effectiveFrom: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveFrom must be YYYY-MM-DD'),
    effectiveTo: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveTo must be YYYY-MM-DD'),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const listRotaQuerySchema = z
  .object({
    employeeId: z.string().trim().optional(),
    month: z.string().trim().optional(),
    year: z.string().trim().optional(),
  })
  .strict();

export const createRegularizationSchema = z
  .object({
    attendanceId: z.string().trim().optional().nullable(),
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    requestedCheckInTime: z.string().datetime().optional().nullable(),
    requestedCheckOutTime: z.string().datetime().optional().nullable(),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();

export const listRegularizationQuerySchema = z
  .object({
    employeeId: z.string().trim().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    month: z.string().trim().optional(),
    year: z.string().trim().optional(),
  })
  .strict();

export const regularizationIdParamSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();

export const decideRegularizationSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    decisionNote: z.string().trim().max(1000).optional(),
  })
  .strict();
