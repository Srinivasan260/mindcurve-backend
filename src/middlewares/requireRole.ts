import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';

type Role = 'patient' | 'admin' | 'doctor';

export const requireRole =
  (...allowed: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient permissions'));
    }
    next();
  };
