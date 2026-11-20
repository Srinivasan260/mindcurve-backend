import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { validate } from '../../middlewares/validate.js';
import { activityController } from './activity.controller.js';
import { listActivityMeQuerySchema } from './activity.validation.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /activity/me:
 *   get:
 *     tags: [Activity]
 *     summary: Paginated activity feed for the currently signed-in user
 *     description: |
 *       Returns entries from `activity_logs` where the authenticated user is the
 *       actor. Available to any authenticated role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema: { type: string, maxLength: 40 }
 *       - in: query
 *         name: action
 *         schema: { type: string, maxLength: 60 }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated activity feed for the current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ActivityLogEntry' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
router.get('/me', validate(listActivityMeQuerySchema), activityController.listMe);

export default router;
