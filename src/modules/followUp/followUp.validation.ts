import { z } from 'zod';

const statusEnum = z.enum(['pending', 'contacted', 'done', 'no_response']);
const priorityEnum = z.enum(['low', 'medium', 'high']);

export const createFollowUpSchema = z.object({
  params: z.object({ patientId: z.uuid('Invalid patient id') }),
  body: z.object({
    assessmentId: z.uuid('Invalid assessment id').nullable().optional(),
    assignedTo: z.uuid('Invalid user id').nullable().optional(),
    priority: priorityEnum.optional(),
    status: statusEnum.optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  }),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>['body'];

export const updateFollowUpSchema = z.object({
  params: z.object({ id: z.uuid('Invalid follow-up id') }),
  body: z
    .object({
      assessmentId: z.uuid().nullable().optional(),
      assignedTo: z.uuid().nullable().optional(),
      priority: priorityEnum.optional(),
      status: statusEnum.optional(),
      scheduledAt: z.coerce.date().nullable().optional(),
      completedAt: z.coerce.date().nullable().optional(),
      notes: z.string().trim().max(5000).nullable().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>['body'];

export const listFollowUpsQuerySchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    assignedTo: z.uuid().optional(),
    patientId: z.uuid().optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export type ListFollowUpsQuery = z.infer<typeof listFollowUpsQuerySchema>['query'];

export const followUpIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid follow-up id') }),
});
