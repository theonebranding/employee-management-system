import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(254, 'Email is too long');

const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be at most 128 characters');

const otpSchema = z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit number');

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Email or employee ID is required').max(64),
    password: z.string().min(1, 'Password is required').max(128),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    email: emailSchema,
    otp: otpSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    resetToken: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{64}$/, 'Invalid reset token format'),
  })
  .strict();
