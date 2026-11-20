import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { dashboardController } from './dashboard.controller.js';

const router = Router();

router.use(requireAuth, requireRole('admin', 'doctor'));

/**
 * @openapi
 * /admin/dashboard/summary:
 *   get:
 *     tags: [Admin · Dashboard]
 *     summary: One-shot dashboard payload (KPIs + charts + activity feed)
 *     description: |
 *       Returns everything the admin dashboard home page needs in a single
 *       round-trip: KPI cards, a trailing-days assessment trend, per-category
 *       risk distribution (for the bar chart), and the 20 most recent
 *       activity log entries.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 90, default: 7 }
 *         description: How many trailing days to include in `assessmentsByDay`.
 *     responses:
 *       200:
 *         description: Dashboard payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/DashboardSummary' }
 */
router.get('/summary', dashboardController.summary);

export default router;
