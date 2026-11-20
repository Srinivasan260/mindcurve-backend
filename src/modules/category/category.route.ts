import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { validate } from '../../middlewares/validate.js';
import { categoryController } from './category.controller.js';
import { categoryIdParamSchema } from './category.validation.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List active assessment categories (patient view)
 *     description: Returns only active categories with a count of their active questions. Inactive categories and inactive questions are hidden.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PatientCategory' }
 *       401: { description: Missing or invalid token }
 */
router.get('/', categoryController.listForPatient);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a single active category (patient view)
 *     description: Returns one active category with its active question count. Useful for the assessment-run sidebar card. Returns 404 if the category is missing or inactive.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/PatientCategory' }
 *       401: { description: Missing or invalid token }
 *       404: { description: Category not found or inactive }
 */
router.get(
  '/:id',
  validate(categoryIdParamSchema),
  categoryController.getByIdForPatient,
);

export default router;
