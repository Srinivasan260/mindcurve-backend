import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { followUpController } from './followUp.controller.js';
import {
  createFollowUpSchema,
  followUpIdParamSchema,
  listFollowUpsQuerySchema,
  updateFollowUpSchema,
} from './followUp.validation.js';

// Nested: /admin/patients/:patientId/follow-ups
export const followUpByPatientRouter = Router({ mergeParams: true });
followUpByPatientRouter.use(requireAuth, requireRole('admin', 'doctor'));

/**
 * @openapi
 * /admin/patients/{patientId}/follow-ups:
 *   post:
 *     tags: [Admin · Follow-ups]
 *     summary: Create a follow-up for a patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/FollowUpCreateRequest' }
 *     responses:
 *       201:
 *         description: Follow-up created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/FollowUp' }
 *       404: { description: Patient not found }
 */
followUpByPatientRouter.post(
  '/',
  validate(createFollowUpSchema),
  followUpController.create,
);

// Flat: /admin/follow-ups
export const followUpRouter = Router();
followUpRouter.use(requireAuth, requireRole('admin', 'doctor'));

/**
 * @openapi
 * /admin/follow-ups:
 *   get:
 *     tags: [Admin · Follow-ups]
 *     summary: Paginated list of follow-ups with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, contacted, done, no_response] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated follow-ups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/FollowUp' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
followUpRouter.get('/', validate(listFollowUpsQuerySchema), followUpController.list);

/**
 * @openapi
 * /admin/follow-ups/{id}:
 *   get:
 *     tags: [Admin · Follow-ups]
 *     summary: Get one follow-up
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Follow-up }
 *       404: { description: Not found }
 */
followUpRouter.get('/:id', validate(followUpIdParamSchema), followUpController.getById);

/**
 * @openapi
 * /admin/follow-ups/{id}:
 *   patch:
 *     tags: [Admin · Follow-ups]
 *     summary: Update a follow-up (status, assignee, scheduled, notes, etc.)
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
 *           schema: { $ref: '#/components/schemas/FollowUpUpdateRequest' }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
followUpRouter.patch('/:id', validate(updateFollowUpSchema), followUpController.update);

/**
 * @openapi
 * /admin/follow-ups/{id}:
 *   delete:
 *     tags: [Admin · Follow-ups]
 *     summary: Delete a follow-up
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
followUpRouter.delete('/:id', validate(followUpIdParamSchema), followUpController.remove);
