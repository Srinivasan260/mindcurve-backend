import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { assessmentController } from './assessment.controller.js';
import {
  assessmentIdParamSchema,
  listAssessmentsAdminQuerySchema,
} from './assessment.validation.js';

const router = Router();

router.use(requireAuth, requireRole('admin', 'doctor'));

/**
 * @openapi
 * /admin/assessments:
 *   get:
 *     tags: [Admin · Assessments]
 *     summary: Paginated list of assessments across all patients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_progress, completed, abandoned]
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated assessment list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AdminAssessmentSummary' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
router.get('/', validate(listAssessmentsAdminQuerySchema), assessmentController.listForAdmin);

/**
 * @openapi
 * /admin/assessments/{id}:
 *   get:
 *     tags: [Admin · Assessments]
 *     summary: Full assessment detail with patient info + question + option text
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Admin assessment detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/AdminAssessmentDetail' }
 *       404: { description: Not found }
 */
router.get('/:id', validate(assessmentIdParamSchema), assessmentController.getByIdForAdmin);

export default router;
