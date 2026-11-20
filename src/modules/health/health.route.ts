import { Router } from 'express';
import { healthController } from './health.controller.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Service liveness probe
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 status: { type: string, example: ok }
 *                 uptime: { type: number, example: 120.4 }
 *                 environment: { type: string, example: development }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/', healthController.check);

export default router;
