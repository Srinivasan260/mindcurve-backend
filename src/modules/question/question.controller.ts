import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { questionService } from './question.service.js';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from './question.validation.js';

export const questionController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const question = await questionService.create(
      req.params.categoryId,
      req.body as CreateQuestionInput,
    );
    res.status(201).json({
      success: true,
      message: 'Question created',
      data: question,
    });
  }),

  listByCategory: asyncHandler(async (req, res) => {
    const questions = await questionService.listByCategory(req.params.categoryId);
    res.json({ success: true, data: questions });
  }),

  listByCategoryForPatient: asyncHandler(async (req, res) => {
    const questions = await questionService.listActiveByCategoryForPatient(
      req.params.categoryId,
    );
    res.json({ success: true, data: questions });
  }),

  getById: asyncHandler(async (req, res) => {
    const question = await questionService.getById(req.params.id);
    res.json({ success: true, data: question });
  }),

  update: asyncHandler(async (req, res) => {
    const question = await questionService.update(
      req.params.id,
      req.body as UpdateQuestionInput,
    );
    res.json({
      success: true,
      message: 'Question updated',
      data: question,
    });
  }),

  remove: asyncHandler(async (req, res) => {
    await questionService.delete(req.params.id);
    res.json({ success: true, message: 'Question deleted' });
  }),
};
