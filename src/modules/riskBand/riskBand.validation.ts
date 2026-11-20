import { z } from 'zod';

const bandBody = z
  .object({
    subscale: z.string().trim().min(1).max(80).nullable().optional(),
    level: z.string().trim().min(1).max(40),
    minScore: z.coerce.number(),
    maxScore: z.coerce.number(),
    label: z.string().trim().max(80).optional(),
    color: z.string().trim().max(20).optional(),
  })
  .refine((d) => d.minScore <= d.maxScore, {
    message: 'minScore must be less than or equal to maxScore',
    path: ['minScore'],
  });

export const createRiskBandSchema = z.object({
  params: z.object({ categoryId: z.uuid('Invalid category id') }),
  body: bandBody,
});

export type CreateRiskBandInput = z.infer<typeof createRiskBandSchema>['body'];

export const updateRiskBandSchema = z.object({
  params: z.object({ id: z.uuid('Invalid risk band id') }),
  body: z
    .object({
      subscale: z.string().trim().min(1).max(80).nullable().optional(),
      level: z.string().trim().min(1).max(40).optional(),
      minScore: z.coerce.number().optional(),
      maxScore: z.coerce.number().optional(),
      label: z.string().trim().max(80).optional(),
      color: z.string().trim().max(20).optional(),
    })
    .refine(
      (d) => d.minScore === undefined || d.maxScore === undefined || d.minScore <= d.maxScore,
      {
        message: 'minScore must be less than or equal to maxScore',
        path: ['minScore'],
      },
    )
    .refine((d) => Object.keys(d).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export type UpdateRiskBandInput = z.infer<typeof updateRiskBandSchema>['body'];

export const bulkReplaceRiskBandsSchema = z.object({
  params: z.object({ categoryId: z.uuid('Invalid category id') }),
  body: z.object({
    // Optional subscale filter: when provided, the replace is scoped to just
    // this subscale. When null/omitted, the whole category's bands are replaced.
    subscale: z.string().trim().min(1).max(80).nullable().optional(),
    bands: z.array(bandBody).min(1, 'At least one band is required'),
  }),
});

export type BulkReplaceRiskBandsInput = z.infer<typeof bulkReplaceRiskBandsSchema>['body'];

export const riskBandIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid risk band id') }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({ categoryId: z.uuid('Invalid category id') }),
});
