import type { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { activityService } from './activity.service.js';
import type {
  ListActivityAdminQuery,
  ListActivityMeQuery,
} from './activity.validation.js';

export const activityController = {
  listAdmin: asyncHandler(async (req: Request, res: Response) => {
    const result = await activityService.listForAdmin(
      req.query as unknown as ListActivityAdminQuery,
    );
    res.json({ success: true, ...result });
  }),

  listMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const result = await activityService.listForUser(
      req.user.sub,
      req.query as unknown as ListActivityMeQuery,
    );
    res.json({ success: true, ...result });
  }),
};
