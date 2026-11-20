import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const DUPLICATE_FIELD_MESSAGES: Record<string, string> = {
  email: 'An account with this email already exists',
  phone: 'An account with this phone number already exists',
};

const extractDuplicateField = (err: unknown): string | undefined => {
  const meta = (err as { meta?: { target?: unknown } }).meta;
  const target = meta?.target;
  const raw = Array.isArray(target) ? target[0] : typeof target === 'string' ? target : undefined;
  if (!raw) return undefined;
  // MySQL returns constraint names like "patient_profiles_phone_key" — strip prefix/suffix.
  const match = /^(?:.+_)?([a-z0-9]+)(?:_key)?$/i.exec(raw);
  return match?.[1] ?? raw;
};

const toApiError = (err: unknown): ApiError | null => {
  if (err instanceof ApiError) return err;

  const code = (err as { code?: string }).code;
  if (code === 'P2002') {
    const field = extractDuplicateField(err);
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

  logger.error(`${statusCode} - ${apiError?.message ?? err.message}`, {
    stack: env.isProd ? undefined : err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(apiError?.details ? { details: apiError.details } : {}),
    ...(env.isProd ? {} : { stack: err.stack }),
  });
};
