import type { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { clinicalNoteService } from './clinicalNote.service.js';
import type {
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
} from './clinicalNote.validation.js';

export const clinicalNoteController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const note = await clinicalNoteService.create(
      req.user.sub,
      req.params.patientId,
      req.body as CreateClinicalNoteInput,
    );
    res.status(201).json({ success: true, message: 'Note added', data: note });
  }),

  listForPatient: asyncHandler(async (req: Request, res: Response) => {
    const notes = await clinicalNoteService.listForPatient(req.params.patientId);
    res.json({ success: true, data: notes });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const note = await clinicalNoteService.update(
      req.params.id,
      req.body as UpdateClinicalNoteInput,
    );
    res.json({ success: true, message: 'Note updated', data: note });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await clinicalNoteService.delete(req.params.id);
    res.json({ success: true, message: 'Note deleted' });
  }),
};
