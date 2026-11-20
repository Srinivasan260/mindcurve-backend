import { patientRepository } from '../patient/patient.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { followUpRepository } from './followUp.repository.js';
import type {
  CreateFollowUpInput,
  ListFollowUpsQuery,
  UpdateFollowUpInput,
} from './followUp.validation.js';

export const followUpService = {
  create: async (patientId: string, input: CreateFollowUpInput) => {
    const patient = await patientRepository.findDetailById(patientId);
    if (!patient) throw new ApiError(404, 'Patient not found');

    return followUpRepository.create({
      patientId,
      assessmentId: input.assessmentId ?? null,
      assignedTo: input.assignedTo ?? null,
      priority: input.priority ?? 'medium',
      status: input.status ?? 'pending',
      scheduledAt: input.scheduledAt ?? null,
      notes: input.notes ?? null,
    });
  },

  list: async (query: ListFollowUpsQuery) => {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const { total, rows } = await followUpRepository.listWithCount({
      status: query.status,
      priority: query.priority,
      assignedTo: query.assignedTo,
      patientId: query.patientId,
      skip,
      take: pageSize,
    });

    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  getById: async (id: string) => {
    const fu = await followUpRepository.findById(id);
    if (!fu) throw new ApiError(404, 'Follow-up not found');
    return fu;
  },

  update: async (id: string, input: UpdateFollowUpInput) => {
    const existing = await followUpRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Follow-up not found');

    // Auto-stamp completedAt when moving to 'done' and caller didn't supply one.
    const completedAt =
      input.status === 'done' && input.completedAt === undefined
        ? new Date()
        : input.completedAt;

    return followUpRepository.update(id, {
      ...(input.assessmentId !== undefined ? { assessmentId: input.assessmentId } : {}),
      ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });
  },

  delete: async (id: string) => {
    const existing = await followUpRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Follow-up not found');
    return followUpRepository.delete(id);
  },
};
