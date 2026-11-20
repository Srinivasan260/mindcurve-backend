import { z } from 'zod';

const optionSchema = z.object({
  text: z.string().trim().min(1, 'Option text is required').max(255),
  score: z.coerce.number().int().min(-100).max(100),
  displayOrder: z.coerce.number().int().nonnegative().optional(),
});

const optionsField = z
  .array(optionSchema)
  .min(2, 'A question must have at least 2 options')
  .max(7, 'A question can have at most 7 options');

const questionBase = {
  questionText: z.string().trim().min(3, 'Question text is too short').max(2000),
  questionType: z.enum(['single_choice', 'multi_choice', 'scale']).optional(),
  subscale: z.string().trim().min(1).max(80).optional(),
  isReverseScored: z.boolean().optional(),
  displayOrder: z.coerce.number().int().nonnegative().optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

export const createQuestionSchema = z.object({
  params: z.object({ categoryId: z.uuid('Invalid category id') }),
  body: z.object({
    ...questionBase,
    options: optionsField,
  }),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>['body'];

export const updateQuestionSchema = z.object({
  params: z.object({ id: z.uuid('Invalid question id') }),
  body: z
    .object({
      questionText: z.string().trim().min(3).max(2000).optional(),
      questionType: z.enum(['single_choice', 'multi_choice', 'scale']).optional(),
      subscale: z.string().trim().min(1).max(80).nullable().optional(),
      isReverseScored: z.boolean().optional(),
      displayOrder: z.coerce.number().int().nonnegative().optional(),
      isRequired: z.boolean().optional(),
      isActive: z.boolean().optional(),
      options: optionsField.optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>['body'];

export const questionIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid question id') }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({ categoryId: z.uuid('Invalid category id') }),
});
