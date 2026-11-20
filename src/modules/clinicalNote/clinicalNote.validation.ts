import { z } from 'zod';

export const createClinicalNoteSchema = z.object({
  params: z.object({ patientId: z.uuid('Invalid patient id') }),
  body: z.object({
    content: z.string().trim().min(1, 'Content is required').max(10000),
    assessmentId: z.uuid('Invalid assessment id').optional(),
  }),
});

export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>['body'];

export const updateClinicalNoteSchema = z.object({
  params: z.object({ id: z.uuid('Invalid note id') }),
  body: z.object({
    content: z.string().trim().min(1).max(10000),
  }),
});

export type UpdateClinicalNoteInput = z.infer<typeof updateClinicalNoteSchema>['body'];

export const noteIdParamSchema = z.object({
  params: z.object({ id: z.uuid('Invalid note id') }),
});

export const patientIdParamSchema = z.object({
  params: z.object({ patientId: z.uuid('Invalid patient id') }),
});
