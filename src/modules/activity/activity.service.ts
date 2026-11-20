import { activityRepository } from './activity.repository.js';
import type {
  ListActivityAdminQuery,
  ListActivityMeQuery,
} from './activity.validation.js';

type ActivityRow = Awaited<
  ReturnType<typeof activityRepository.listWithCount>
>['rows'][number];

const serialize = (row: ActivityRow) => ({
  id: row.id,
  action: row.action,
  entityType: row.entityType,
  entityId: row.entityId,
  metadata: row.metadata,
  createdAt: row.createdAt,
  actor: row.actor
    ? {
        id: row.actor.id,
        email: row.actor.email,
        role: row.actor.role,
        fullName: row.actor.patientProfile?.fullName ?? null,
      }
    : null,
});

const paginate = async (filters: {
  actorId?: string;
  entityType?: string;
  action?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}) => {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const skip = (page - 1) * pageSize;

  const { total, rows } = await activityRepository.listWithCount({
    actorId: filters.actorId,
    entityType: filters.entityType,
    action: filters.action,
    from: filters.from,
    to: filters.to,
    skip,
    take: pageSize,
  });

  return {
    data: rows.map(serialize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
};

export const activityService = {
  listForAdmin: (query: ListActivityAdminQuery) => paginate(query),

  listForUser: (userId: string, query: ListActivityMeQuery) =>
    paginate({ ...query, actorId: userId }),
};
