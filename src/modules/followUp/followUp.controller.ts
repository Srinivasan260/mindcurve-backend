import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { followUpService } from './followUp.service.js';
import type {
  CreateFollowUpInput,
  ListFollowUpsQuery,
  UpdateFollowUpInput,
} from './followUp.validation.js';

export const followUpController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const fu = await followUpService.create(
      req.params.patientId,
      req.body as CreateFollowUpInput,
    );
    res.status(201).json({ success: true, message: 'Follow-up created', data: fu });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await followUpService.list(req.query as unknown as ListFollowUpsQuery);
    res.json({ success: true, ...result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const fu = await followUpService.getById(req.params.id);
    res.json({ success: true, data: fu });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const fu = await followUpService.update(
      req.params.id,
      req.body as UpdateFollowUpInput,
    );
    res.json({ success: true, message: 'Follow-up updated', data: fu });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await followUpService.delete(req.params.id);
    res.json({ success: true, message: 'Follow-up deleted' });
  }),
};
