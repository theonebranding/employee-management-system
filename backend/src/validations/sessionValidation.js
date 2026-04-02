import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const revokeSessionParamSchema = z
  .object({
    sessionId: z.string().regex(objectIdRegex, 'Invalid session ID'),
  })
  .strict();

export const listSessionsQuerySchema = z
  .object({
    role: z.enum(['admin', 'employee']).optional(),
    isActive: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'boolean' ? value : value === 'true'))
      .optional(),
  })
  .strict();
