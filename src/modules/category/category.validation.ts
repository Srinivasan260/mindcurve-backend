import { z } from 'zod';

const slugField = z
  .string()
  .trim()
  .min(2)
  .max(140)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only');

const scoringTypeField = z.enum(['total', 'subscale_sum_cutoff', 'subscale_mean_band']);

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    slug: slugField.optional(),
    description: z.string().trim().max(2000).optional(),
    scoringType: scoringTypeField.optional(),
    displayOrder: z.coerce.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];

export const updateCategorySchema = z.object({
  params: z.object({ id: z.uuid('Invalid category id') }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      slug: slugField.optional(),
      description: z.string().trim().max(2000).optional(),
      scoringType: scoringTypeField.optional(),
      displayOrder: z.coerce.number().int().nonnegative().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];

export const categoryIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid category id') }),
});
