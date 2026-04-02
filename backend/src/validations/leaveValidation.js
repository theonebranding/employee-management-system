import { z } from 'zod';

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const createLeaveSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
    leaveTypeCode: z.string().trim().min(2).max(30).optional(),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .strict()
  .refine((data) => new Date(`${data.endDate}T00:00:00.000Z`) >= new Date(`${data.startDate}T00:00:00.000Z`), {
    message: 'endDate must be greater than or equal to startDate',
    path: ['endDate'],
  });

export const leaveIdParamSchema = z
  .object({
    leaveId: z.string().trim().min(1),
  })
  .strict();

export const leaveEmployeeIdParamSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
  })
  .strict();

export const updateLeaveStatusSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    decisionNote: z.string().trim().max(500).optional(),
  })
  .strict();
