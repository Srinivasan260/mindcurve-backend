import 'dotenv/config';

type NodeEnv = 'development' | 'production' | 'test';

const required = (key: string, value: string | undefined): string => {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const toNumber = (key: string, value: string | undefined, fallback?: number): number => {
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required numeric environment variable: ${key}`);
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, received: ${value}`);
  }
  return parsed;
};

export const env = {
  nodeEnv: (process.env.NODE_ENV ?? 'development') as NodeEnv,
  port: toNumber('PORT', process.env.PORT, 5000),
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  corsOrigin: required('CORS_ORIGIN', process.env.CORS_ORIGIN),
  logLevel: process.env.LOG_LEVEL ?? 'dev',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  magicLinkTtlMinutes: toNumber('MAGIC_LINK_TTL_MINUTES', process.env.MAGIC_LINK_TTL_MINUTES, 60),
  jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: toNumber('SMTP_PORT', process.env.SMTP_PORT, 587),
    secure: (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
  mailFrom: process.env.MAIL_FROM ?? 'no-reply@athma.example.com',
  mailFromName: process.env.MAIL_FROM_NAME ?? 'Athma Mind Care',
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
} as const;
