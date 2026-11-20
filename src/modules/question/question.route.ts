import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { validate } from '../../middlewares/validate.js';
import { questionController } from './question.controller.js';
import { categoryIdParamSchema } from './question.validation.js';

// Mounted at /categories/:categoryId/questions
const router = Router({ mergeParams: true });

router.use(requireAuth);

/**
 * @openapi
 * /categories/{categoryId}/questions:
 *   get:
 *     tags: [Categories]
 *     summary: List active questions for a category (patient view, scores hidden)
 *     description: Returns only active questions with option text + id. Admin-only fields like scores are stripped.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Questions list for the patient to answer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PatientQuestion' }
 *       401: { description: Unauthorized }
 *       404: { description: Category not found or inactive }
 */
router.get(
  '/',
  validate(categoryIdParamSchema),
  questionController.listByCategoryForPatient,
);

export default router;
