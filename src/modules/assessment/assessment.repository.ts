import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export interface SubscaleResultInput {
  subscale: string | null;
  totalScore: number;
  riskLevel: string;
}

export interface AssessmentListFilters {
  patientId?: string;
  categoryId?: string;
  status?: 'in_progress' | 'completed' | 'abandoned';
  skip: number;
  take: number;
}

export const assessmentRepository = {
  findPatientProfileByUserId: (userId: string) =>
    prisma.patientProfile.findUnique({
      where: { userId },
      select: { id: true, fullName: true },
    }),

  findInProgressFor: (patientId: string, categoryId: string) =>
    prisma.assessment.findFirst({
      where: { patientId, categoryId, status: 'in_progress' },
      orderBy: { startedAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    }),

  // Minimal answer list for seeding the quiz UI when resuming or reopening.
  listAnswersForSeed: (assessmentId: string) =>
    prisma.answer.findMany({
      where: { assessmentId },
      select: {
        questionId: true,
        selectedOptionId: true,
      },
      orderBy: { answeredAt: 'asc' },
    }),

  // Latest *completed* attempt for this patient+category. Used by `start` to
  // reopen a prior submission for editing when no in-progress attempt exists.
  findLatestCompletedFor: (patientId: string, categoryId: string) =>
    prisma.assessment.findFirst({
      where: { patientId, categoryId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    }),

  // Reopen a completed assessment so the patient can edit and resubmit.
  // Resets status, drops the finalized score + result breakdown; answers remain.
  reopenCompleted: (assessmentId: string) =>
    prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'in_progress',
          completedAt: null,
          overallRiskLevel: null,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });
      await tx.assessmentCategoryResult.deleteMany({
        where: { assessmentId },
      });
      return assessment;
    }),

  create: (patientId: string, categoryId: string) =>
    prisma.assessment.create({
      data: { patientId, categoryId, status: 'in_progress' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    }),

  findByIdForPatient: (id: string, patientId: string) =>
    prisma.assessment.findFirst({
      where: { id, patientId },
      include: {
        category: {
          select: { id: true, name: true, slug: true, scoringType: true },
        },
      },
    }),

  // Fetch the chosen option PLUS its question (for is_reverse_scored flag) and
  // sibling options (for the min/max needed by the reverse-score formula).
  findOptionWithQuestionContext: (
    questionId: string,
    optionId: string,
    categoryId: string,
  ) =>
    prisma.questionOption.findFirst({
      where: {
        id: optionId,
        questionId,
        question: { categoryId, isActive: true },
      },
      include: {
        question: {
          select: {
            isReverseScored: true,
            options: { select: { score: true } },
          },
        },
      },
    }),

  upsertAnswer: (
    assessmentId: string,
    questionId: string,
    selectedOptionId: string,
    scoreSnapshot: number,
  ) =>
    prisma.answer.upsert({
      where: { assessmentId_questionId: { assessmentId, questionId } },
      create: { assessmentId, questionId, selectedOptionId, scoreSnapshot },
      update: { selectedOptionId, scoreSnapshot, answeredAt: new Date() },
    }),

  // Fetch answers with each question's subscale (needed by subscale-based recipes).
  getAnswersWithSubscale: (assessmentId: string) =>
    prisma.answer.findMany({
      where: { assessmentId },
      select: {
        questionId: true,
        selectedOptionId: true,
        scoreSnapshot: true,
        question: {
          select: { subscale: true },
        },
      },
    }),

  getBandsForCategory: (categoryId: string) =>
    prisma.categoryRiskBand.findMany({
      where: { categoryId },
      orderBy: [{ subscale: 'asc' }, { minScore: 'asc' }],
    }),

  // Marks the assessment completed and writes N result rows in one transaction.
  completeWithResults: (
    assessmentId: string,
    categoryId: string,
    overallRiskLevel: string | null,
    results: SubscaleResultInput[],
  ) =>
    prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          overallRiskLevel,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      // Clean slate (only matters if a prior failed submit left partial rows).
      await tx.assessmentCategoryResult.deleteMany({
        where: { assessmentId },
      });

      await tx.assessmentCategoryResult.createMany({
        data: results.map((r) => ({
          assessmentId,
          categoryId,
          subscale: r.subscale,
          totalScore: r.totalScore,
          riskLevel: r.riskLevel,
        })),
      });

      return assessment;
    }),

  listForAdmin: async (filters: AssessmentListFilters) => {
    const where: Prisma.AssessmentWhereInput = {
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.assessment.count({ where }),
      prisma.assessment.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: [{ startedAt: 'desc' }],
        select: {
          id: true,
          status: true,
          overallRiskLevel: true,
          startedAt: true,
          completedAt: true,
          category: { select: { id: true, name: true, slug: true, scoringType: true } },
          patient: {
            select: { id: true, fullName: true, user: { select: { email: true } } },
          },
          categoryResults: {
            select: { subscale: true, totalScore: true, riskLevel: true },
            orderBy: { subscale: 'asc' },
          },
        },
      }),
    ]);
    return { total, rows };
  },

  // Single-query fetch for the admin patient-detail "Score Summary" card.
  // Scoped by patientId so a URL from one patient can't surface another's scores.
  findSummaryForAdmin: (assessmentId: string, patientId: string) =>
    prisma.assessment.findFirst({
      where: { id: assessmentId, patientId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        overallRiskLevel: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            scoringType: true,
            riskBands: {
              select: {
                subscale: true,
                level: true,
                minScore: true,
                maxScore: true,
                label: true,
                color: true,
              },
              orderBy: [{ subscale: 'asc' }, { minScore: 'asc' }],
            },
          },
        },
        categoryResults: {
          select: { subscale: true, totalScore: true, riskLevel: true },
          orderBy: { subscale: 'asc' },
        },
      },
    }),

  // Admin patient-detail Q&A panel. Left-joins Answer onto every active Question
  // in the category so the response always contains the full question list
  // (unanswered ones included), letting the frontend filter client-side.
  findAnswersForAdmin: (assessmentId: string, patientId: string) =>
    prisma.assessment.findFirst({
      where: { id: assessmentId, patientId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            questions: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              select: {
                id: true,
                questionText: true,
                questionType: true,
                subscale: true,
                isReverseScored: true,
                isRequired: true,
                displayOrder: true,
                options: {
                  select: { id: true, optionText: true, score: true, displayOrder: true },
                  orderBy: { displayOrder: 'asc' },
                },
                answers: {
                  where: { assessmentId },
                  select: {
                    id: true,
                    selectedOptionId: true,
                    scoreSnapshot: true,
                    answeredAt: true,
                    selectedOption: {
                      select: { id: true, optionText: true, score: true, displayOrder: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),

  // Fetches everything needed to render the patient PDF report: the patient
  // header fields + every attempted (non in_progress) assessment with its
  // questions and selected answers, in display order.
  //
  // When assessmentId is provided, only that assessment is returned — supports
  // the single-assessment download variant.
  findReportDataForAdmin: (patientId: string, assessmentId?: string) =>
    prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        age: true,
        gender: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        createdAt: true,
        user: { select: { email: true } },
        assessments: {
          where: {
            status: { in: ['completed', 'abandoned'] },
            ...(assessmentId ? { id: assessmentId } : {}),
          },
          orderBy: [{ category: { displayOrder: 'asc' } }, { startedAt: 'asc' }],
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                displayOrder: true,
                questions: {
                  where: { isActive: true },
                  orderBy: { displayOrder: 'asc' },
                  select: {
                    id: true,
                    questionText: true,
                    displayOrder: true,
                  },
                },
              },
            },
            answers: {
              select: {
                questionId: true,
                scoreSnapshot: true,
                selectedOption: {
                  select: { optionText: true, score: true },
                },
              },
            },
          },
        },
      },
    }),

  findAdminDetail: (id: string) =>
    prisma.assessment.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true, scoringType: true },
        },
        patient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            city: true,
            user: { select: { email: true } },
          },
        },
        answers: {
          orderBy: { answeredAt: 'asc' },
          select: {
            id: true,
            scoreSnapshot: true,
            answeredAt: true,
            question: {
              select: {
                id: true,
                questionText: true,
                subscale: true,
                isReverseScored: true,
                displayOrder: true,
              },
            },
            selectedOption: {
              select: { id: true, optionText: true, score: true, displayOrder: true },
            },
          },
        },
        categoryResults: {
          select: { subscale: true, totalScore: true, riskLevel: true },
          orderBy: { subscale: 'asc' },
        },
      },
    }),

  listForPatient: (
    patientId: string,
    filters: { status?: 'in_progress' | 'completed' | 'abandoned'; categoryId?: string },
  ) =>
    prisma.assessment.findMany({
      where: {
        patientId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      },
      select: {
        id: true,
        status: true,
        overallRiskLevel: true,
        startedAt: true,
        completedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        categoryResults: {
          select: { subscale: true, totalScore: true, riskLevel: true },
          orderBy: { subscale: 'asc' },
        },
      },
      orderBy: [{ startedAt: 'desc' }],
      take: 100,
    }),

  findDetailForPatient: (id: string, patientId: string) =>
    prisma.assessment.findFirst({
      where: { id, patientId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        answers: {
          select: {
            questionId: true,
            selectedOptionId: true,
            scoreSnapshot: true,
            answeredAt: true,
          },
          orderBy: { answeredAt: 'asc' },
        },
        categoryResults: {
          select: {
            subscale: true,
            totalScore: true,
            riskLevel: true,
          },
          orderBy: { subscale: 'asc' },
        },
      },
    }),
};

export type AssessmentRepository = typeof assessmentRepository;
