import type { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { categoryService } from './category.service.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.validation.js';

export const categoryController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const category = await categoryService.create(
      req.user.sub,
      req.body as CreateCategoryInput,
    );
    res.status(201).json({
      success: true,
      message: 'Category created',
      data: category,
    });
  }),

  list: asyncHandler(async (_req, res) => {
    const categories = await categoryService.list();
    res.json({ success: true, data: categories });
  }),

  stats: asyncHandler(async (_req, res) => {
    const data = await categoryService.stats();
    res.json({ success: true, data });
  }),

  listForPatient: asyncHandler(async (_req, res) => {
    const categories = await categoryService.listActiveForPatient();
    res.json({ success: true, data: categories });
  }),

  getByIdForPatient: asyncHandler(async (req, res) => {
    const category = await categoryService.getByIdForPatient(req.params.id);
    res.json({ success: true, data: category });
  }),

  getById: asyncHandler(async (req, res) => {
    const category = await categoryService.getById(req.params.id);
    res.json({ success: true, data: category });
  }),

  update: asyncHandler(async (req, res) => {
    const category = await categoryService.update(
      req.params.id,
      req.body as UpdateCategoryInput,
    );
    res.json({
      success: true,
      message: 'Category updated',
      data: category,
    });
  }),

  remove: asyncHandler(async (req, res) => {
    await categoryService.delete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  }),
};
