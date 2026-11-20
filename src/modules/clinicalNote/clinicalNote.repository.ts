import { prisma } from '../../config/prisma.js';

const noteAuthorSelect = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  assessmentId: true,
  author: { select: { id: true, email: true, role: true } },
} as const;

export const clinicalNoteRepository = {
  findById: (id: string) => prisma.clinicalNote.findUnique({ where: { id } }),

  listForPatient: (patientId: string) =>
    prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: noteAuthorSelect,
    }),

  create: (data: {
    patientId: string;
    authorId: string;
    content: string;
    assessmentId?: string;
  }) =>
    prisma.clinicalNote.create({
      data: {
        patientId: data.patientId,
        authorId: data.authorId,
        content: data.content,
        assessmentId: data.assessmentId ?? null,
      },
      select: noteAuthorSelect,
    }),

  update: (id: string, content: string) =>
    prisma.clinicalNote.update({
      where: { id },
      data: { content },
      select: noteAuthorSelect,
    }),

  delete: (id: string) => prisma.clinicalNote.delete({ where: { id } }),
};

export type ClinicalNoteRepository = typeof clinicalNoteRepository;
