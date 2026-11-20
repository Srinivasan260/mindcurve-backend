import type { Request, Response } from 'express';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { assessmentService } from './assessment.service.js';
import type {
  ListAssessmentsAdminQuery,
  ListMyAssessmentsQuery,
  SubmitAnswerInput,
} from './assessment.validation.js';

export const assessmentController = {
  start: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const assessment = await assessmentService.start(req.user.sub, req.params.categoryId);
    res.status(201).json({
      success: true,
      message: 'Assessment started',
      data: assessment,
    });
  }),

  submitAnswer: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const answer = await assessmentService.submitAnswer(
      req.user.sub,
      req.params.id,
      req.body as SubmitAnswerInput,
    );
    res.status(200).json({
      success: true,
      message: 'Answer recorded',
      data: answer,
    });
  }),

  submit: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const result = await assessmentService.submit(req.user.sub, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Assessment submitted',
      data: result,
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const assessment = await assessmentService.getById(req.user.sub, req.params.id);
    res.json({ success: true, data: assessment });
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Unauthorized');
    const assessments = await assessmentService.listMine(
      req.user.sub,
      req.query as unknown as ListMyAssessmentsQuery,
    );
    res.json({ success: true, data: assessments });
  }),

  listForAdmin: asyncHandler(async (req: Request, res: Response) => {
    const result = await assessmentService.listForAdmin(
      req.query as unknown as ListAssessmentsAdminQuery,
    );
    res.json({ success: true, ...result });
  }),

  getByIdForAdmin: asyncHandler(async (req: Request, res: Response) => {
    const assessment = await assessmentService.getByIdForAdmin(req.params.id);
    res.json({ success: true, data: assessment });
  }),
};
