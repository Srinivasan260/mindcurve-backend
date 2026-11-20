import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

const summarySelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      email: true,
      role: true,
      patientProfile: { select: { fullName: true } },
    },
  },
} as const;

export interface ListActivityFilters {
  actorId?: string;
  entityType?: string;
  action?: string;
  from?: Date;
  to?: Date;
  skip: number;
  take: number;
}

const buildWhere = (filters: ListActivityFilters): Prisma.ActivityLogWhereInput => ({
  ...(filters.actorId ? { actorId: filters.actorId } : {}),
  ...(filters.entityType ? { entityType: filters.entityType } : {}),
  ...(filters.action ? { action: filters.action } : {}),
  ...(filters.from || filters.to
    ? {
        createdAt: {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        },
      }
    : {}),
});

export const activityRepository = {
  listWithCount: async (filters: ListActivityFilters) => {
    const where = buildWhere(filters);
    const [total, rows] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: 'desc' },
        select: summarySelect,
      }),
    ]);
    return { total, rows };
  },
};

export type ActivityRepository = typeof activityRepository;
