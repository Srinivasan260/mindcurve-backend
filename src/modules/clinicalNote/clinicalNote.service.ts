import { authRepository } from '../auth/auth.repository.js';
import { patientRepository } from '../patient/patient.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { clinicalNoteRepository } from './clinicalNote.repository.js';
import type {
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
} from './clinicalNote.validation.js';

export const clinicalNoteService = {
  create: async (authorId: string, patientId: string, input: CreateClinicalNoteInput) => {
    const patient = await patientRepository.findDetailById(patientId);
    if (!patient) throw new ApiError(404, 'Patient not found');

    const note = await clinicalNoteRepository.create({
      patientId,
      authorId,
      content: input.content,
      assessmentId: input.assessmentId,
    });

    await authRepository.logActivity({
      actorId: authorId,
      action: 'note_added',
      entityType: 'clinical_note',
      entityId: note.id,
      metadata: {
        patientId,
        patientName: patient.fullName,
        assessmentId: input.assessmentId ?? null,
      },
    });

    return note;
  },

  listForPatient: async (patientId: string) => {
    const patient = await patientRepository.findDetailById(patientId);
    if (!patient) throw new ApiError(404, 'Patient not found');
    return clinicalNoteRepository.listForPatient(patientId);
  },

  update: async (id: string, input: UpdateClinicalNoteInput) => {
    const note = await clinicalNoteRepository.findById(id);
    if (!note) throw new ApiError(404, 'Note not found');
    return clinicalNoteRepository.update(id, input.content);
  },

  delete: async (id: string) => {
    const note = await clinicalNoteRepository.findById(id);
    if (!note) throw new ApiError(404, 'Note not found');
    return clinicalNoteRepository.delete(id);
  },
};
