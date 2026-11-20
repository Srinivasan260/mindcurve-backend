import { z } from 'zod';

export const registerSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2, 'Full name is too short').max(150),
      email: z.email({ message: 'Invalid email' }).trim().toLowerCase().max(191),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password is too long'),
      confirmPassword: z.string(),
      phone: z.string().trim().min(6).max(20),
      age: z.coerce.number().int().positive().max(130),
      gender: z.enum(['male', 'female', 'other']),
      address: z.string().trim().min(2).max(255),
      city: z.string().trim().min(2).max(80),
      state: z.string().trim().min(2).max(80),
      pincode: z.string().trim().min(3).max(12),
      location: z.string().trim().min(2).max(120),
      maritalStatus: z.enum(['single', 'married', 'other']).optional(),
      education: z.string().trim().max(120).optional(),
      occupation: z.string().trim().max(120).optional(),
      referredBy: z.string().trim().max(120).optional(),
      consent: z.literal(true, { message: 'Consent must be accepted' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];

export const loginSchema = z.object({
  body: z.object({
    email: z.email({ message: 'Invalid email' }).trim().toLowerCase().max(191),
    password: z.string().min(1, 'Password is required').max(100),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];

export const magicLoginSchema = z.object({
  body: z.object({
    token: z.string().trim().min(16, 'Token is required').max(256),
  }),
});

export type MagicLoginInput = z.infer<typeof magicLoginSchema>['body'];
