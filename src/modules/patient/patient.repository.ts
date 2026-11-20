import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export interface PatientListFilters {
  search?: string;
  city?: string;
  skip: number;
  take: number;
}

const buildWhere = (filters: Omit<PatientListFilters, 'skip' | 'take'>): Prisma.PatientProfileWhereInput => {
  const where: Prisma.PatientProfileWhereInput = {};
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search } },
      { user: { email: { contains: filters.search } } },
    ];
  }
  if (filters.city) {
    where.city = filters.city;
  }
  return where;
};

export const patientRepository = {
  listWithCount: async (filters: PatientListFilters) => {
    const where = buildWhere(filters);
    const [total, rows] = await Promise.all([
      prisma.patientProfile.count({ where }),
      prisma.patientProfile.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          phone: true,
          age: true,
          gender: true,
          city: true,
          state: true,
          createdAt: true,
          consentAcceptedAt: true,
          user: {
            select: {
              email: true,
              isEmailVerified: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          _count: { select: { assessments: true } },
          assessments: {
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: {
              startedAt: true,
              completedAt: true,
              status: true,
              overallRiskLevel: true,
            },
          },
        },
      }),
    ]);
    return { total, rows };
  },

  findDetailById: (id: string) =>
    prisma.patientProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            isEmailVerified: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        assessments: {
          orderBy: { startedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            overallRiskLevel: true,
            startedAt: true,
            completedAt: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                _count: { select: { questions: { where: { isActive: true } } } },
              },
            },
            _count: { select: { answers: true } },
            categoryResults: {
              select: { subscale: true, totalScore: true, riskLevel: true },
              orderBy: { subscale: 'asc' },
            },
          },
        },
        clinicalNotes: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, email: true, role: true } },
          },
        },
        _count: { select: { assessments: true, clinicalNotes: true, followUps: true } },
      },
    }),
};

export type PatientRepository = typeof patientRepository;
