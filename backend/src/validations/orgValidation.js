import { z } from 'zod';

const orgTypeSchema = z.enum(['department', 'team', 'location', 'cost-center']);

export const createOrgUnitSchema = z
  .object({
    type: orgTypeSchema,
    code: z.string().trim().min(1).max(50),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(400).optional(),
    parent: z.string().trim().optional().nullable(),
    manager: z.string().trim().optional().nullable(),
  })
  .strict();

export const listOrgUnitsQuerySchema = z
  .object({
    type: orgTypeSchema.optional(),
    isActive: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const orgUnitIdParamSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();

export const updateOrgUnitSchema = z
  .object({
    code: z.string().trim().min(1).max(50).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(400).optional(),
    parent: z.string().trim().optional().nullable(),
    manager: z.string().trim().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();
