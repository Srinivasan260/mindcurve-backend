import type { Request, Response } from 'express';
import { env } from '../../config/env.js';

export const healthController = {
  check: (_req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      status: 'ok',
      uptime: process.uptime(),
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  },
};
