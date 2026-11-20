import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export interface OptionInput {
  optionText: string;
  score: number;
  displayOrder: number;
}

const optionsInclude = {
  options: { orderBy: { displayOrder: 'asc' as const } },
} satisfies Prisma.QuestionInclude;

export const questionRepository = {
  findByIdWithOptions: (id: string) =>
    prisma.question.findUnique({
      where: { id },
      include: optionsInclude,
    }),

  listByCategory: (categoryId: string) =>
    prisma.question.findMany({
      where: { categoryId },
      include: optionsInclude,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    }),

  listActiveByCategoryForPatient: (categoryId: string) =>
    prisma.question.findMany({
      where: { categoryId, isActive: true },
      select: {
        id: true,
        questionText: true,
        questionType: true,
        displayOrder: true,
        isRequired: true,
        options: {
          select: {
            id: true,
            optionText: true,
            displayOrder: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    }),

  create: (
    data: Omit<Prisma.QuestionUncheckedCreateInput, 'options'>,
    options: OptionInput[],
  ) =>
    prisma.question.create({
      data: {
        ...data,
        options: { create: options },
      },
      include: optionsInclude,
    }),

  updateMetadata: (id: string, data: Prisma.QuestionUncheckedUpdateInput) =>
    prisma.question.update({
      where: { id },
      data,
      include: optionsInclude,
    }),

  updateWithOptions: (
    id: string,
    data: Prisma.QuestionUncheckedUpdateInput,
    options: OptionInput[],
  ) =>
    prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({ where: { questionId: id } });
      return tx.question.update({
        where: { id },
        data: {
          ...data,
          options: { create: options },
        },
        include: {
          options: { orderBy: { displayOrder: 'asc' } },
        },
      });
    }),

  delete: (id: string) => prisma.question.delete({ where: { id } }),
};

export type QuestionRepository = typeof questionRepository;
