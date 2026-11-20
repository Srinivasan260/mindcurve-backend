import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { assessmentService } from '../assessment/assessment.service.js';
import { patientService } from './patient.service.js';
import type { ListPatientsQuery } from './patient.validation.js';

export const patientController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await patientService.list(req.query as unknown as ListPatientsQuery);
    res.json({ success: true, ...result });
  }),

  getDetail: asyncHandler(async (req: Request, res: Response) => {
    const patient = await patientService.getDetail(req.params.id);
    res.json({ success: true, data: patient });
  }),

  getAssessmentSummary: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.getSummaryForAdmin(
      req.params.id,
      req.params.assessmentId,
    );
    res.json({ success: true, data });
  }),

  getAssessmentAnswers: asyncHandler(async (req: Request, res: Response) => {
    const filter = (req.query.filter as 'all' | 'answered' | 'not_attended' | undefined) ?? 'all';
    const data = await assessmentService.getAnswersForAdmin(
      req.params.id,
      req.params.assessmentId,
      filter,
    );
    res.json({ success: true, data });
  }),

  downloadReport: asyncHandler(async (req: Request, res: Response) => {
    const assessmentId =
      typeof req.query.assessmentId === 'string' ? req.query.assessmentId : undefined;
    const pdf = await patientService.generateReportPdf(req.params.id, assessmentId);
    const filename = `assessment-report-${req.params.id.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length.toString());
    res.end(pdf);
  }),
};
