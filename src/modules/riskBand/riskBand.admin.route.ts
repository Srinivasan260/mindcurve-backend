import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { riskBandController } from './riskBand.controller.js';
import {
  bulkReplaceRiskBandsSchema,
  categoryIdParamSchema,
  createRiskBandSchema,
  riskBandIdParamSchema,
  updateRiskBandSchema,
} from './riskBand.validation.js';

// ---------------------------------------------------------------------------
// Nested router — mounted at /admin/categories/:categoryId/risk-bands
// ---------------------------------------------------------------------------
export const riskBandCategoryRouter = Router({ mergeParams: true });
riskBandCategoryRouter.use(requireAuth, requireRole('admin'));

/**
 * @openapi
 * /admin/categories/{categoryId}/risk-bands:
 *   post:
 *     tags: [Admin · Risk Bands]
 *     summary: Create one risk band for a category/subscale
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
 *           schema: { $ref: '#/components/schemas/RiskBandCreateRequest' }
 *     responses:
 *       201:
 *         description: Risk band created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/RiskBand' }
 *       401: { description: Unauthorized }
 *       403: { description: Not admin }
 *       404: { description: Category not found }
 *       409: { description: Range overlaps an existing band }
 */
riskBandCategoryRouter.post(
  '/',
  validate(createRiskBandSchema),
  riskBandController.create,
);

/**
 * @openapi
 * /admin/categories/{categoryId}/risk-bands:
 *   get:
 *     tags: [Admin · Risk Bands]
 *     summary: List all risk bands configured for a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Risk bands grouped by subscale
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/RiskBand' }
 */
riskBandCategoryRouter.get(
  '/',
  validate(categoryIdParamSchema),
  riskBandController.list,
);

/**
 * @openapi
 * /admin/categories/{categoryId}/risk-bands:
 *   put:
 *     tags: [Admin · Risk Bands]
 *     summary: Bulk replace risk bands (optionally scoped to one subscale)
 *     description: Deletes existing bands for the category (or just the specified subscale when `subscale` is provided) and inserts the new set. Rejected if the payload contains overlapping ranges within the same subscale.
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
 *           schema: { $ref: '#/components/schemas/RiskBandBulkReplaceRequest' }
 *     responses:
 *       200: { description: Replaced }
 *       404: { description: Category not found }
 *       422: { description: Overlap or duplicate (subscale, level) in payload }
 */
riskBandCategoryRouter.put(
  '/',
  validate(bulkReplaceRiskBandsSchema),
  riskBandController.bulkReplace,
);

// ---------------------------------------------------------------------------
// Flat router — mounted at /admin/risk-bands
// ---------------------------------------------------------------------------
export const riskBandRouter = Router();
riskBandRouter.use(requireAuth, requireRole('admin'));

/**
 * @openapi
 * /admin/risk-bands/{id}:
 *   patch:
 *     tags: [Admin · Risk Bands]
 *     summary: Update one risk band
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
 *           schema: { $ref: '#/components/schemas/RiskBandUpdateRequest' }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *       409: { description: Range overlap with sibling band }
 */
riskBandRouter.patch(
  '/:id',
  validate(updateRiskBandSchema),
  riskBandController.update,
);

/**
 * @openapi
 * /admin/risk-bands/{id}:
 *   delete:
 *     tags: [Admin · Risk Bands]
 *     summary: Delete one risk band
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
riskBandRouter.delete(
  '/:id',
  validate(riskBandIdParamSchema),
  riskBandController.remove,
);
