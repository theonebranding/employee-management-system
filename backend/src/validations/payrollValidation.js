import { z } from 'zod';

const monthSchema = z.number().int().min(1).max(12);
const yearSchema = z.number().int().min(2000).max(2100);

export const createPayrollRunSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    month: monthSchema,
    year: yearSchema,
    scope: z
      .object({
        department: z.string().trim().optional().nullable(),
        location: z.string().trim().optional().nullable(),
        costCenter: z.string().trim().optional().nullable(),
        employeeIds: z.array(z.string().trim().min(1)).optional(),
      })
      .optional(),
  })
  .strict();

export const payrollRunIdParamSchema = z
  .object({
    runId: z.string().trim().min(1),
  })
  .strict();

export const listPayrollRunsQuerySchema = z
  .object({
    month: z.string().trim().optional(),
    year: z.string().trim().optional(),
    status: z.enum(['draft', 'validated', 'locked', 'released']).optional(),
  })
  .strict();

export const createPayrollUnlockRequestSchema = z
  .object({
    reason: z.string().trim().min(5).max(1000),
  })
  .strict();

export const payrollUnlockRequestIdParamSchema = z
  .object({
    requestId: z.string().trim().min(1),
  })
  .strict();

export const decidePayrollUnlockRequestSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    decisionNote: z.string().trim().max(1000).optional(),
  })
  .strict();

export const listPayrollChangeControlsQuerySchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
  })
  .strict();
