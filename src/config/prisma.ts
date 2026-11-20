import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

export const prisma = new PrismaClient({
  log: env.isDev ? ['warn', 'error'] : ['error'],
});

export const connectDb = async (): Promise<void> => {
  await prisma.$connect();
};

export const disconnectDb = async (): Promise<void> => {
  await prisma.$disconnect();
};
