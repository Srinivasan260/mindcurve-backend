import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const daysRaw = req.query.days;
    const days = (() => {
      if (typeof daysRaw !== 'string') return 7;
      const n = Number(daysRaw);
      if (!Number.isFinite(n) || n < 1 || n > 90) return 7;
      return Math.floor(n);
    })();

    const data = await dashboardService.getSummary(days);
    res.json({ success: true, data });
  }),
};
