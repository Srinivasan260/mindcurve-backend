import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const DUPLICATE_FIELD_MESSAGES: Record<string, string> = {
  email: 'An account with this email already exists',
  phone: 'An account with this phone number already exists',
};

const toApiError = (err: Error): ApiError | null => {
  if (err instanceof ApiError) return err;

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = err.meta?.target;
    const field = Array.isArray(target) ? target[0] : typeof target === 'string' ? target : undefined;
    const message = (field && DUPLICATE_FIELD_MESSAGES[field]) ?? 'A record with these details already exists';
    return new ApiError(409, message);
  }

  return null;
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const apiError = toApiError(err);
  const statusCode = apiError?.statusCode ?? 500;
  const message = apiError?.message ?? 'Internal Server Error';

  logger.error(`${statusCode} - ${err.message}`, {
    stack: env.isProd ? undefined : err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(apiError?.details ? { details: apiError.details } : {}),
    ...(env.isProd ? {} : { stack: err.stack }),
  });
};
