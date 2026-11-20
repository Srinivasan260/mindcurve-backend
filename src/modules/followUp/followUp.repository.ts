import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

const summarySelect = {
  id: true,
  status: true,
  priority: true,
  scheduledAt: true,
  completedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  assessmentId: true,
  patient: {
    select: { id: true, fullName: true, user: { select: { email: true } } },
  },
  assignee: {
    select: { id: true, email: true, role: true },
  },
} as const;

export interface ListFollowUpFilters {
  status?: 'pending' | 'contacted' | 'done' | 'no_response';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string;
  patientId?: string;
  skip: number;
  take: number;
}

export const followUpRepository = {
  findById: (id: string) =>
    prisma.followUp.findUnique({ where: { id }, select: summarySelect }),

  listWithCount: async (filters: ListFollowUpFilters) => {
    const where: Prisma.FollowUpWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.assignedTo ? { assignedTo: filters.assignedTo } : {}),
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: [
          // Pending/high-priority items float to the top of the queue.
          { completedAt: { sort: 'asc', nulls: 'first' } },
          { priority: 'desc' },
          { scheduledAt: 'asc' },
          { createdAt: 'desc' },
        ],
        select: summarySelect,
      }),
    ]);
    return { total, rows };
  },

  create: (data: Prisma.FollowUpUncheckedCreateInput) =>
    prisma.followUp.create({ data, select: summarySelect }),

  update: (id: string, data: Prisma.FollowUpUncheckedUpdateInput) =>
    prisma.followUp.update({ where: { id }, data, select: summarySelect }),

  delete: (id: string) => prisma.followUp.delete({ where: { id } }),
};

export type FollowUpRepository = typeof followUpRepository;
