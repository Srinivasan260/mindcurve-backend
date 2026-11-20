import { pdfService } from '../../services/pdf.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { assessmentRepository } from '../assessment/assessment.repository.js';
import { patientRepository } from './patient.repository.js';
import {
  renderReportHtml,
  type ReportData,
  type ReportSection,
} from './patient.report.template.js';
import type { ListPatientsQuery } from './patient.validation.js';

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const patientService = {
  list: async (query: ListPatientsQuery) => {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    const { total, rows } = await patientRepository.listWithCount({
      search: query.search,
      city: query.city,
      skip,
      take: pageSize,
    });

    return {
      data: rows.map((p) => {
        const latest = p.assessments[0];
        return {
          id: p.id,
          fullName: p.fullName,
          email: p.user.email,
          phone: p.phone,
          age: p.age,
          gender: p.gender,
          city: p.city,
          state: p.state,
          registeredAt: p.createdAt,
          consentAcceptedAt: p.consentAcceptedAt,
          isEmailVerified: p.user.isEmailVerified,
          isActive: p.user.isActive,
          lastLoginAt: p.user.lastLoginAt,
          assessmentsCount: p._count.assessments,
          lastAssessment: latest
            ? {
                startedAt: latest.startedAt,
                completedAt: latest.completedAt,
                status: latest.status,
                overallRiskLevel: latest.overallRiskLevel,
              }
            : null,
        };
      }),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  getDetail: async (id: string) => {
    const p = await patientRepository.findDetailById(id);
    if (!p) throw new ApiError(404, 'Patient not found');

    return {
      id: p.id,
      fullName: p.fullName,
      email: p.user.email,
      phone: p.phone,
      age: p.age,
      gender: p.gender,
      address: p.address,
      city: p.city,
      state: p.state,
      pincode: p.pincode,
      location: p.location,
      maritalStatus: p.maritalStatus,
      education: p.education,
      occupation: p.occupation,
      referredBy: p.referredBy,
      consentAcceptedAt: p.consentAcceptedAt,
      consentVersion: p.consentVersion,
      user: {
        email: p.user.email,
        isEmailVerified: p.user.isEmailVerified,
        isActive: p.user.isActive,
        lastLoginAt: p.user.lastLoginAt,
        joinedAt: p.user.createdAt,
      },
      stats: {
        assessmentsCount: p._count.assessments,
        clinicalNotesCount: p._count.clinicalNotes,
        followUpsCount: p._count.followUps,
      },
      recentAssessments: p.assessments.map((a) => {
        const answered = a._count.answers;
        const total = a.category._count.questions;
        const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
        return {
          id: a.id,
          status: a.status,
          overallRiskLevel: a.overallRiskLevel,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          category: { id: a.category.id, name: a.category.name, slug: a.category.slug },
          progress: { answered, total, percent },
          results: a.categoryResults.map((r) => ({
            subscale: r.subscale,
            totalScore: Number(r.totalScore),
            riskLevel: r.riskLevel,
          })),
        };
      }),
      recentNotes: p.clinicalNotes.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt,
        author: n.author,
      })),
    };
  },

  // Renders the admin patient PDF report. If `assessmentId` is provided only
  // that assessment is included; otherwise every attempted assessment is
  // emitted as its own section in display order.
  generateReportPdf: async (patientId: string, assessmentId?: string): Promise<Buffer> => {
    const p = await assessmentRepository.findReportDataForAdmin(patientId, assessmentId);
    if (!p) throw new ApiError(404, 'Patient not found');

    const sections: ReportSection[] = p.assessments.map((a) => {
      const answerByQuestion = new Map(a.answers.map((ans) => [ans.questionId, ans]));
      const questions = a.category.questions.map((q, idx) => {
        const ans = answerByQuestion.get(q.id);
        return {
          number: idx + 1,
          text: q.questionText,
          optionText: ans?.selectedOption.optionText ?? null,
          score: ans?.scoreSnapshot ?? null,
          attempted: ans !== undefined,
        };
      });
      const answered = questions.filter((q) => q.attempted).length;
      return {
        categoryName: a.category.name,
        counts: { answered, notAttended: questions.length - answered, total: questions.length },
        questions,
      };
    });

    const addressLines = [p.address, [p.city, p.state, p.pincode].filter(Boolean).join(', ')]
      .filter((s): s is string => Boolean(s && s.trim()));

    const data: ReportData = {
      patient: {
        // Short display id derived from the UUID. Replace with a sequential
        // patient_number column once that migration lands.
        displayId: p.id.replace(/-/g, '').slice(0, 8).toUpperCase(),
        fullName: p.fullName,
        age: p.age,
        gender: p.gender,
        phone: p.phone,
        email: p.user.email,
        addressLines,
        registeredOn: DATE_FMT.format(p.createdAt),
      },
      generatedOn: DATE_FMT.format(new Date()),
      sections,
    };

    const html = renderReportHtml(data);
    return pdfService.renderHtml(html);
  },
};
