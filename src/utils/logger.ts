import { env } from '../config/env.js';

type Level = 'info' | 'warn' | 'error' | 'debug';

const stamp = (): string => new Date().toISOString();

const emit = (level: Level, message: unknown, meta?: unknown): void => {
  const line = `[${stamp()}] [${level.toUpperCase()}] ${
    typeof message === 'string' ? message : JSON.stringify(message)
  }`;
  const payload = meta !== undefined ? `${line} ${JSON.stringify(meta)}` : line;
  if (level === 'error') {
    console.error(payload);
  } else if (level === 'warn') {
    console.warn(payload);
  } else {
    console.log(payload);
  }
};

export const logger = {
  info: (message: unknown, meta?: unknown) => emit('info', message, meta),
  warn: (message: unknown, meta?: unknown) => emit('warn', message, meta),
  error: (message: unknown, meta?: unknown) => emit('error', message, meta),
  debug: (message: unknown, meta?: unknown) => {
    if (env.isDev) emit('debug', message, meta);
  },
};
