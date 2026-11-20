import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { categoryController } from './category.controller.js';
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from './category.validation.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

/**
 * @openapi
 * /admin/categories:
 *   post:
 *     tags: [Admin · Categories]
 *     summary: Create a new assessment category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CategoryCreateRequest' }
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Category created }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       401: { description: Missing or invalid token }
 *       403: { description: Forbidden (not admin) }
 *       409: { description: Slug already exists }
 *       422: { description: Validation failed }
 */
router.post('/', validate(createCategorySchema), categoryController.create);

/**
 * @openapi
 * /admin/categories:
 *   get:
 *     tags: [Admin · Categories]
 *     summary: List all categories (including inactive)
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
 *                   items: { $ref: '#/components/schemas/Category' }
 */
router.get('/', categoryController.list);

/**
 * @openapi
 * /admin/categories/stats:
 *   get:
 *     tags: [Admin · Categories]
 *     summary: KPI counters for the Questions & Answers page (categories + questions)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPI counters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCategories: { type: integer, example: 6 }
 *                     activeCategories: { type: integer, example: 6 }
 *                     inactiveCategories: { type: integer, example: 0 }
 *                     totalQuestions: { type: integer, example: 154 }
 *                     activeQuestions: { type: integer, example: 154 }
 */
router.get('/stats', categoryController.stats);

/**
 * @openapi
 * /admin/categories/{id}:
 *   get:
 *     tags: [Admin · Categories]
 *     summary: Get a single category by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Category' }
 *       404: { description: Not found }
 */
router.get('/:id', validate(categoryIdParamSchema), categoryController.getById);

/**
 * @openapi
 * /admin/categories/{id}:
 *   patch:
 *     tags: [Admin · Categories]
 *     summary: Update a category
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
 *           schema: { $ref: '#/components/schemas/CategoryUpdateRequest' }
 *     responses:
 *       200:
 *         description: Category updated
 *       404: { description: Not found }
 *       409: { description: Slug conflict }
 */
router.patch('/:id', validate(updateCategorySchema), categoryController.update);

/**
 * @openapi
 * /admin/categories/{id}:
 *   delete:
 *     tags: [Admin · Categories]
 *     summary: Hard-delete a category (cascades to questions and options)
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
router.delete('/:id', validate(categoryIdParamSchema), categoryController.remove);

export default router;
