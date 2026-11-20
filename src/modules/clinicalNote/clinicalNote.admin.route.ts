import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { clinicalNoteController } from './clinicalNote.controller.js';
import {
  createClinicalNoteSchema,
  noteIdParamSchema,
  patientIdParamSchema,
  updateClinicalNoteSchema,
} from './clinicalNote.validation.js';

// Nested router: /admin/patients/:patientId/notes
export const noteByPatientRouter = Router({ mergeParams: true });
noteByPatientRouter.use(requireAuth, requireRole('admin', 'doctor'));

/**
 * @openapi
 * /admin/patients/{patientId}/notes:
 *   post:
 *     tags: [Admin · Clinical Notes]
 *     summary: Add a clinical note on a patient (optionally tied to an assessment)
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
 *           schema: { $ref: '#/components/schemas/ClinicalNoteCreateRequest' }
 *     responses:
 *       201:
 *         description: Note added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/ClinicalNote' }
 *       404: { description: Patient not found }
 */
noteByPatientRouter.post(
  '/',
  validate(createClinicalNoteSchema),
  clinicalNoteController.create,
);

/**
 * @openapi
 * /admin/patients/{patientId}/notes:
 *   get:
 *     tags: [Admin · Clinical Notes]
 *     summary: List notes for a patient (newest first)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ClinicalNote' }
 */
noteByPatientRouter.get(
  '/',
  validate(patientIdParamSchema),
  clinicalNoteController.listForPatient,
);

// Flat router: /admin/notes
export const noteRouter = Router();
noteRouter.use(requireAuth, requireRole('admin', 'doctor'));

/**
 * @openapi
 * /admin/notes/{id}:
 *   patch:
 *     tags: [Admin · Clinical Notes]
 *     summary: Edit a note's content
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
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
noteRouter.patch('/:id', validate(updateClinicalNoteSchema), clinicalNoteController.update);

/**
 * @openapi
 * /admin/notes/{id}:
 *   delete:
 *     tags: [Admin · Clinical Notes]
 *     summary: Delete a note
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
noteRouter.delete('/:id', validate(noteIdParamSchema), clinicalNoteController.remove);
