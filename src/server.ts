import app from './app.js';
import { connectDb, disconnectDb } from './config/prisma.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const bootstrap = async (): Promise<void> => {
  await connectDb();
  logger.info('Database connected.');

  const server = app.listen(env.port, () => {
    logger.info(
      `Server running in ${env.nodeEnv} mode on http://localhost:${env.port}${env.apiPrefix}`,
    );
  });

  const shutdown = (signal: string): void => {
    logger.warn(`${signal} received. Closing server gracefully...`);
    server.close(async (err) => {
      if (err) {
        logger.error('Error during shutdown', { error: err.message });
        process.exit(1);
      }
      await disconnectDb();
      logger.info('Server closed.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forcing shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: (err as Error).message });
  process.exit(1);
});
