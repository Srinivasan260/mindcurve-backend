import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export interface BandInput {
  subscale: string | null;
  level: string;
  minScore: number;
  maxScore: number;
  label?: string | null;
  color?: string | null;
}

export const riskBandRepository = {
  findById: (id: string) => prisma.categoryRiskBand.findUnique({ where: { id } }),

  listByCategory: (categoryId: string) =>
    prisma.categoryRiskBand.findMany({
      where: { categoryId },
      orderBy: [{ subscale: 'asc' }, { minScore: 'asc' }],
    }),

  listByCategoryAndSubscale: (categoryId: string, subscale: string | null) =>
    prisma.categoryRiskBand.findMany({
      where: { categoryId, subscale },
      orderBy: [{ minScore: 'asc' }],
    }),

  create: (categoryId: string, data: BandInput) =>
    prisma.categoryRiskBand.create({
      data: {
        categoryId,
        subscale: data.subscale,
        level: data.level,
        minScore: data.minScore,
        maxScore: data.maxScore,
        label: data.label,
        color: data.color,
      },
    }),

  update: (id: string, data: Prisma.CategoryRiskBandUpdateInput) =>
    prisma.categoryRiskBand.update({ where: { id }, data }),

  delete: (id: string) => prisma.categoryRiskBand.delete({ where: { id } }),

  // Atomic replace: wipe the category's bands (optionally scoped to one
  // subscale) and insert the new set in one transaction.
  replaceSet: (categoryId: string, subscale: string | null | undefined, bands: BandInput[]) =>
    prisma.$transaction(async (tx) => {
      await tx.categoryRiskBand.deleteMany({
        where: {
          categoryId,
          ...(subscale !== undefined ? { subscale } : {}),
        },
      });
      await tx.categoryRiskBand.createMany({
        data: bands.map((b) => ({
          categoryId,
          subscale: b.subscale,
          level: b.level,
          minScore: b.minScore,
          maxScore: b.maxScore,
          label: b.label,
          color: b.color,
        })),
      });
      return tx.categoryRiskBand.findMany({
        where: { categoryId },
        orderBy: [{ subscale: 'asc' }, { minScore: 'asc' }],
      });
    }),
};

export type RiskBandRepository = typeof riskBandRepository;
