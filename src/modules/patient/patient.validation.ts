import { z } from 'zod';

export const listPatientsQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().max(80).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>['query'];

export const patientIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid patient id') }),
});

export const patientAssessmentIdParamSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid patient id'),
    assessmentId: z.uuid('Invalid assessment id'),
  }),
});

export const patientReportSchema = z.object({
  params: z.object({ id: z.uuid('Invalid patient id') }),
  query: z.object({
    assessmentId: z.uuid().optional(),
  }),
});

export const patientAssessmentAnswersSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid patient id'),
    assessmentId: z.uuid('Invalid assessment id'),
  }),
  query: z.object({
    filter: z.enum(['all', 'answered', 'not_attended']).optional(),
  }),
});

export type PatientAssessmentAnswersQuery = z.infer<
  typeof patientAssessmentAnswersSchema
>['query'];
