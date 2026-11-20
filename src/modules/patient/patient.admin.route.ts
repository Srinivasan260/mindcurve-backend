import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { patientController } from './patient.controller.js';
import {
  listPatientsQuerySchema,
  patientAssessmentAnswersSchema,
  patientAssessmentIdParamSchema,
  patientIdParamSchema,
  patientReportSchema,
} from './patient.validation.js';

const router = Router();

router.use(requireAuth, requireRole('admin', 'doctor'));

/**
 * @openapi
 * /admin/patients:
 *   get:
 *     tags: [Admin · Patients]
 *     summary: Paginated list of patients with search + city filter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches fullName or email (case-insensitive)
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated patient list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AdminPatientSummary' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
router.get('/', validate(listPatientsQuerySchema), patientController.list);

/**
 * @openapi
 * /admin/patients/{id}:
 *   get:
 *     tags: [Admin · Patients]
 *     summary: Full patient detail with recent assessments + notes + stats
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Patient detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/AdminPatientDetail' }
 *       404: { description: Not found }
 */
router.get('/:id', validate(patientIdParamSchema), patientController.getDetail);

/**
 * @openapi
 * /admin/patients/{id}/assessments/{assessmentId}/summary:
 *   get:
 *     tags: [Admin · Patients]
 *     summary: Score Summary for one of this patient's assessments
 *     description: |
 *       Polymorphic response driven by `category.scoringType`:
 *       - **total** → `total` present, `subscales` empty
 *       - **subscale_sum_cutoff** → `total` and `subscales` both present
 *       - **subscale_mean_band** → `total` null, `subscales` present
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Score summary
 *       404: { description: Assessment not found for this patient }
 */
router.get(
  '/:id/assessments/:assessmentId/summary',
  validate(patientAssessmentIdParamSchema),
  patientController.getAssessmentSummary,
);

/**
 * @openapi
 * /admin/patients/{id}/assessments/{assessmentId}/answers:
 *   get:
 *     tags: [Admin · Patients]
 *     summary: Per-question answers for the Q&A panel, with filter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, answered, not_attended]
 *           default: all
 *     responses:
 *       200:
 *         description: Question list with selected-option details and counts
 *       404: { description: Assessment not found for this patient }
 */
router.get(
  '/:id/assessments/:assessmentId/answers',
  validate(patientAssessmentAnswersSchema),
  patientController.getAssessmentAnswers,
);

/**
 * @openapi
 * /admin/patients/{id}/report:
 *   get:
 *     tags: [Admin · Patients]
 *     summary: Download the patient assessment report as PDF
 *     description: |
 *       Returns a PDF stream. Without `assessmentId` the report contains every
 *       attempted assessment in display order. With `assessmentId` only that
 *       one assessment is included.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: assessmentId
 *         required: false
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF report
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       404: { description: Patient not found }
 */
router.get(
  '/:id/report',
  validate(patientReportSchema),
  patientController.downloadReport,
);

export default router;
