import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { assessmentController } from './assessment.controller.js';
import {
  assessmentIdParamSchema,
  listMyAssessmentsQuerySchema,
  startAssessmentParamSchema,
  submitAnswerSchema,
} from './assessment.validation.js';

// ---------------------------------------------------------------------------
// Nested router — mounted at /categories/:categoryId/assessments
// ---------------------------------------------------------------------------
export const assessmentCategoryRouter = Router({ mergeParams: true });
assessmentCategoryRouter.use(requireAuth, requireRole('patient'));

/**
 * @openapi
 * /categories/{categoryId}/assessments:
 *   post:
 *     tags: [Assessments]
 *     summary: Start a new assessment for a category (patient only)
 *     description: Creates a new assessment in `in_progress` state. Fails with 409 if the patient already has an in-progress assessment for this same category.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Assessment started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/AssessmentStartResult' }
 *       401: { description: Unauthorized }
 *       403: { description: Not a patient }
 *       404: { description: Category not found or inactive }
 *       409: { description: Already have an in-progress assessment for this category }
 */
assessmentCategoryRouter.post(
  '/',
  validate(startAssessmentParamSchema),
  assessmentController.start,
);

// ---------------------------------------------------------------------------
// Flat router — mounted at /assessments
// ---------------------------------------------------------------------------
export const assessmentRouter = Router();
assessmentRouter.use(requireAuth, requireRole('patient'));

/**
 * @openapi
 * /assessments:
 *   get:
 *     tags: [Assessments]
 *     summary: List my past assessments (newest first)
 *     description: Returns up to the 100 most recent assessments for the logged-in patient, with per-subscale results if the assessment is completed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [in_progress, completed, abandoned]
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Assessment history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AssessmentSummary' }
 */
assessmentRouter.get(
  '/',
  validate(listMyAssessmentsQuerySchema),
  assessmentController.listMine,
);

/**
 * @openapi
 * /assessments/{id}/answers:
 *   post:
 *     tags: [Assessments]
 *     summary: Submit (or replace) one answer in an in-progress assessment
 *     description: Idempotent per question — re-submitting the same questionId replaces the previous selection and refreshes the score snapshot.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AnswerSubmitRequest' }
 *     responses:
 *       200:
 *         description: Answer recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Answer' }
 *       404: { description: Assessment not found or not owned by patient }
 *       409: { description: Assessment is no longer in progress }
 *       422: { description: Invalid question or option for this assessment }
 */
assessmentRouter.post(
  '/:id/answers',
  validate(submitAnswerSchema),
  assessmentController.submitAnswer,
);

/**
 * @openapi
 * /assessments/{id}/submit:
 *   post:
 *     tags: [Assessments]
 *     summary: Finalize an assessment and compute risk level
 *     description: Sums all answer `scoreSnapshot` values, looks up the matching `category_risk_bands` row, and records the result. If no band is configured, defaults to `moderate` with a logged warning.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Assessment finalized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/AssessmentSubmitResult' }
 *       404: { description: Assessment not found }
 *       409: { description: Assessment is no longer in progress }
 */
assessmentRouter.post(
  '/:id/submit',
  validate(assessmentIdParamSchema),
  assessmentController.submit,
);

/**
 * @openapi
 * /assessments/{id}:
 *   get:
 *     tags: [Assessments]
 *     summary: Get own assessment detail (answers + computed result)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Assessment detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/AssessmentDetail' }
 *       404: { description: Not found }
 */
assessmentRouter.get(
  '/:id',
  validate(assessmentIdParamSchema),
  assessmentController.getById,
);
