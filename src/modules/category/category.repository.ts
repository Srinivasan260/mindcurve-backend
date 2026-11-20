import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export const categoryRepository = {
  findBySlug: (slug: string) => prisma.category.findUnique({ where: { slug } }),

  findById: (id: string) => prisma.category.findUnique({ where: { id } }),

  list: () =>
    prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    }),

  stats: async () => {
    const [totalCategories, activeCategories, totalQuestions, activeQuestions] =
      await Promise.all([
        prisma.category.count(),
        prisma.category.count({ where: { isActive: true } }),
        prisma.question.count(),
        prisma.question.count({ where: { isActive: true } }),
      ]);
    return {
      totalCategories,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
      totalQuestions,
      activeQuestions,
    };
  },

  listActiveForPatient: () =>
    prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            questions: { where: { isActive: true } },
          },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    }),

  findActiveByIdForPatient: (id: string) =>
    prisma.category.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        scoringType: true,
        displayOrder: true,
        _count: {
          select: {
            questions: { where: { isActive: true } },
          },
        },
      },
    }),

  create: (data: Prisma.CategoryUncheckedCreateInput) =>
    prisma.category.create({ data }),

  update: (id: string, data: Prisma.CategoryUncheckedUpdateInput) =>
    prisma.category.update({ where: { id }, data }),

  delete: (id: string) => prisma.category.delete({ where: { id } }),
};

export type CategoryRepository = typeof categoryRepository;
