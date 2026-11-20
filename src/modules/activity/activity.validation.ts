import { z } from 'zod';

const trimmedString = (max: number) => z.string().trim().min(1).max(max);

const baseQuery = {
  entityType: trimmedString(40).optional(),
  action: trimmedString(60).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
};

export const listActivityAdminQuerySchema = z.object({
  query: z.object({
    ...baseQuery,
    actorId: z.uuid('Invalid actor id').optional(),
  }),
});

export type ListActivityAdminQuery = z.infer<
  typeof listActivityAdminQuerySchema
>['query'];

export const listActivityMeQuerySchema = z.object({
  query: z.object(baseQuery),
});

export type ListActivityMeQuery = z.infer<typeof listActivityMeQuerySchema>['query'];
