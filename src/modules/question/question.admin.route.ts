import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { questionController } from './question.controller.js';
import {
  categoryIdParamSchema,
  createQuestionSchema,
  questionIdParamSchema,
  updateQuestionSchema,
} from './question.validation.js';

// ---------------------------------------------------------------------------
// Nested router — mounted at /admin/categories/:categoryId/questions
// ---------------------------------------------------------------------------
export const questionCategoryRouter = Router({ mergeParams: true });
questionCategoryRouter.use(requireAuth, requireRole('admin'));

/**
 * @openapi
 * /admin/categories/{categoryId}/questions:
 *   post:
 *     tags: [Admin · Questions]
 *     summary: Create a question with 2-7 options inside a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/QuestionCreateRequest' }
 *     responses:
 *       201:
 *         description: Question created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Question' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden (not admin) }
 *       404: { description: Category not found }
 *       422: { description: Validation failed }
 */
questionCategoryRouter.post(
  '/',
  validate(createQuestionSchema),
  questionController.create,
);

/**
 * @openapi
 * /admin/categories/{categoryId}/questions:
 *   get:
 *     tags: [Admin · Questions]
 *     summary: List all questions in a category (with options)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Questions list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Question' }
 *       404: { description: Category not found }
 */
questionCategoryRouter.get(
  '/',
  validate(categoryIdParamSchema),
  questionController.listByCategory,
);

// ---------------------------------------------------------------------------
// Flat router — mounted at /admin/questions
// ---------------------------------------------------------------------------
export const questionRouter = Router();
questionRouter.use(requireAuth, requireRole('admin'));

/**
 * @openapi
 * /admin/questions/{id}:
 *   get:
 *     tags: [Admin · Questions]
 *     summary: Get a question with its options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Question
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Question' }
 *       404: { description: Not found }
 */
questionRouter.get('/:id', validate(questionIdParamSchema), questionController.getById);

/**
 * @openapi
 * /admin/questions/{id}:
 *   patch:
 *     tags: [Admin · Questions]
 *     summary: Update a question (optionally replace all options)
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
 *           schema: { $ref: '#/components/schemas/QuestionUpdateRequest' }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
questionRouter.patch('/:id', validate(updateQuestionSchema), questionController.update);

/**
 * @openapi
 * /admin/questions/{id}:
 *   delete:
 *     tags: [Admin · Questions]
 *     summary: Delete a question (cascades to its options)
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
questionRouter.delete('/:id', validate(questionIdParamSchema), questionController.remove);
