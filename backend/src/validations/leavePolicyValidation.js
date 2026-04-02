import { z } from 'zod';

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const leaveTypeCodeParamSchema = z
  .object({
    code: z.string().trim().min(2).max(30),
  })
  .strict();

export const createLeaveTypeSchema = z
  .object({
    code: z.string().trim().min(2).max(30).regex(/^[A-Z0-9_-]+$/),
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(300).optional(),
    paid: z.boolean().optional(),
    accrualEnabled: z.boolean().optional(),
    monthlyAccrual: z.number().min(0).max(10).optional(),
    maxBalance: z.number().min(0).max(365).optional(),
    carryForwardLimit: z.number().min(0).max(365).optional(),
    encashmentEnabled: z.boolean().optional(),
    sandwichRuleEnabled: z.boolean().optional(),
    requiresDocumentAfterDays: z.number().int().min(0).max(60).optional(),
    locations: z.array(z.string().trim().min(1)).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial();

export const leaveBalanceQuerySchema = z
  .object({
    employeeId: z.string().trim().optional(),
    year: z.string().trim().optional(),
    leaveTypeCode: z.string().trim().optional(),
  })
  .strict();

export const adjustLeaveBalanceSchema = z
  .object({
    employeeId: z.string().trim().min(1),
    leaveTypeCode: z.string().trim().min(2),
    year: z.number().int().min(2000).max(2100),
    adjustment: z.number().min(-365).max(365),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

export const runAccrualSchema = z
  .object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  })
  .strict();

export const createLeaveEncashmentSchema = z
  .object({
    employeeId: z.string().trim().optional(),
    leaveTypeCode: z.string().trim().min(2).max(30),
    year: z.number().int().min(2000).max(2100),
    daysRequested: z.number().min(0.5).max(365),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

export const listLeaveEncashmentQuerySchema = z
  .object({
    employeeId: z.string().trim().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'paid']).optional(),
    year: z.string().trim().optional(),
  })
  .strict();

export const encashmentRequestIdParamSchema = z
  .object({
    requestId: z.string().trim().min(1),
  })
  .strict();

export const decideLeaveEncashmentSchema = z
  .object({
    decision: z.enum(['approved', 'rejected', 'paid']),
    approvedDays: z.number().min(0.5).max(365).optional(),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

export const runYearEndCarryForwardSchema = z
  .object({
    sourceYear: z.number().int().min(2000).max(2100),
  })
  .strict();

export const previewLeaveQuerySchema = z
  .object({
    employeeId: z.string().trim().optional(),
    leaveTypeCode: z.string().trim().min(2).max(30),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .strict();

export const previewEncashmentQuerySchema = z
  .object({
    employeeId: z.string().trim().optional(),
    leaveTypeCode: z.string().trim().min(2).max(30),
    year: z.coerce.number().int().min(2000).max(2100),
    daysRequested: z.coerce.number().min(0.5).max(365),
  })
  .strict();
