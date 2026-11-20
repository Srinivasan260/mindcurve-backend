import { z } from 'zod';

export const startAssessmentParamSchema = z.object({
  params: z.object({ categoryId: z.uuid('Invalid category id') }),
});

export const assessmentIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid assessment id') }),
});

export const listMyAssessmentsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
    categoryId: z.uuid('Invalid category id').optional(),
  }),
});

export type ListMyAssessmentsQuery = z.infer<typeof listMyAssessmentsQuerySchema>['query'];

export const listAssessmentsAdminQuerySchema = z.object({
  query: z.object({
    patientId: z.uuid('Invalid patient id').optional(),
    categoryId: z.uuid('Invalid category id').optional(),
    status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export type ListAssessmentsAdminQuery = z.infer<typeof listAssessmentsAdminQuerySchema>['query'];

export const submitAnswerSchema = z.object({
  params: z.object({ id: z.uuid('Invalid assessment id') }),
  body: z.object({
    questionId: z.uuid('Invalid question id'),
    selectedOptionId: z.uuid('Invalid option id'),
  }),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>['body'];
