import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { activityController } from './activity.controller.js';
import { listActivityAdminQuerySchema } from './activity.validation.js';

const router = Router();

router.use(requireAuth, requireRole('admin', 'doctor'));

/**
 * @openapi
 * /admin/activity:
 *   get:
 *     tags: [Admin · Activity]
 *     summary: Paginated activity feed across the platform
 *     description: |
 *       Returns entries from the `activity_logs` table in reverse-chronological
 *       order. Supports filtering by actor, entity, action, and date range.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: actorId
 *         schema: { type: string, format: uuid }
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
 *         description: Paginated activity feed
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
router.get('/', validate(listActivityAdminQuerySchema), activityController.listAdmin);

export default router;
