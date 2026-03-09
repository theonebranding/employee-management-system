import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const locationSchema = z
  .object({
    latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
    longitude: z.coerce
      .number()
      .min(-180, 'Longitude must be >= -180')
      .max(180, 'Longitude must be <= 180'),
  })
  .strict();

export const attendanceCheckInSchema = locationSchema;

export const attendanceCheckOutSchema = locationSchema
  .extend({
    dailyReport: z
      .string()
      .trim()
      .max(5000, 'Daily report must be 5000 characters or less')
      .optional(),
  })
  .strict();

export const attendanceParamsSchema = z
  .object({
    attendanceId: z.string().regex(objectIdRegex, 'Invalid attendance ID'),
  })
  .strict();

export const updateAttendanceSchema = z
  .object({
    checkInTime: z.coerce.date().optional(),
    checkOutTime: z.coerce.date().optional(),
    totalRecessDuration: z.coerce.number().min(0).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.checkInTime !== undefined ||
      data.checkOutTime !== undefined ||
      data.totalRecessDuration !== undefined,
    {
      message: 'At least one field is required',
    }
  )
  .refine(
    (data) =>
      !(data.checkInTime instanceof Date && data.checkOutTime instanceof Date) ||
      data.checkOutTime >= data.checkInTime,
    {
      message: 'checkOutTime must be greater than or equal to checkInTime',
      path: ['checkOutTime'],
    }
  );
