import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { riskBandService } from './riskBand.service.js';
import type {
  BulkReplaceRiskBandsInput,
  CreateRiskBandInput,
  UpdateRiskBandInput,
} from './riskBand.validation.js';

export const riskBandController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const band = await riskBandService.create(
      req.params.categoryId,
      req.body as CreateRiskBandInput,
    );
    res.status(201).json({
      success: true,
      message: 'Risk band created',
      data: band,
    });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const bands = await riskBandService.list(req.params.categoryId);
    res.json({ success: true, data: bands });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const band = await riskBandService.update(
      req.params.id,
      req.body as UpdateRiskBandInput,
    );
    res.json({ success: true, message: 'Risk band updated', data: band });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await riskBandService.delete(req.params.id);
    res.json({ success: true, message: 'Risk band deleted' });
  }),

  bulkReplace: asyncHandler(async (req: Request, res: Response) => {
    const bands = await riskBandService.bulkReplace(
      req.params.categoryId,
      req.body as BulkReplaceRiskBandsInput,
    );
    res.json({
      success: true,
      message: 'Risk bands replaced',
      data: bands,
    });
  }),
};
