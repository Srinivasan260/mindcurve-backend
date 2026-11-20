import { authRepository } from '../auth/auth.repository.js';
import { categoryRepository } from '../category/category.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import {
  assessmentRepository,
  type SubscaleResultInput,
} from './assessment.repository.js';
import type {
  ListAssessmentsAdminQuery,
  ListMyAssessmentsQuery,
  SubmitAnswerInput,
} from './assessment.validation.js';

const DEFAULT_LEVEL = 'moderate';
const NORMAL_LEVEL = 'normal';
const FLAGGED_LEVEL = 'flagged';

type Band = {
  subscale: string | null;
  level: string;
  minScore: number;
  maxScore: number;
};

// ---------------------------------------------------------------------------
// Scoring helpers (one per recipe)
// ---------------------------------------------------------------------------

type AnswerWithSubscale = {
  questionId: string;
  scoreSnapshot: number;
  question: { subscale: string | null };
};

/** Recipe A: sum all answers → look up the single matching band. */
const computeTotal = (answers: AnswerWithSubscale[], bands: Band[]): SubscaleResultInput[] => {
  const total = answers.reduce((s, a) => s + a.scoreSnapshot, 0);
  const matched = bands
    .filter((b) => b.subscale === null && total >= b.minScore && total <= b.maxScore)
    .sort((a, b) => b.minScore - a.minScore)[0];
  if (!matched) {
    logger.warn(`No band matched total ${total}; defaulting to '${DEFAULT_LEVEL}'`);
  }
  return [
    {
      subscale: null,
      totalScore: total,
      riskLevel: matched?.level ?? DEFAULT_LEVEL,
    },
  ];
};

/**
 * Recipe B: group by subscale, sum each, compare to the subscale's cutoff
 * band. A band with a matching subscale is treated as a cutoff
 * (sum >= min_score means flagged). We also compute an "overall" row.
 */
const computeSubscaleSumCutoff = (
  answers: AnswerWithSubscale[],
  bands: Band[],
): SubscaleResultInput[] => {
  const bySubscale = new Map<string, number>();
  for (const a of answers) {
    const s = a.question.subscale;
    if (!s) continue;
    bySubscale.set(s, (bySubscale.get(s) ?? 0) + a.scoreSnapshot);
  }

  const results: SubscaleResultInput[] = [];
  for (const [subscale, sum] of bySubscale) {
    const subBands = bands.filter((b) => b.subscale === subscale);
    const matched = subBands
      .filter((b) => sum >= b.minScore && sum <= b.maxScore)
      .sort((a, b) => b.minScore - a.minScore)[0];
    results.push({
      subscale,
      totalScore: sum,
      riskLevel: matched?.level ?? NORMAL_LEVEL,
    });
  }

  // Overall row (sum of everything)
  const overallSum = answers.reduce((s, a) => s + a.scoreSnapshot, 0);
  const overallBands = bands.filter((b) => b.subscale === 'overall' || b.subscale === null);
  const overallMatched = overallBands
    .filter((b) => overallSum >= b.minScore && overallSum <= b.maxScore)
    .sort((a, b) => b.minScore - a.minScore)[0];
  results.push({
    subscale: 'overall',
    totalScore: overallSum,
    riskLevel: overallMatched?.level ?? NORMAL_LEVEL,
  });

  return results;
};

/**
 * Recipe C: group by subscale → mean → look up benchmark band.
 * (Reverse scoring is already applied at answer time when the raw score is
 * snapshotted, so nothing to flip here.)
 */
const computeSubscaleMeanBand = (
  answers: AnswerWithSubscale[],
  bands: Band[],
): SubscaleResultInput[] => {
  const bySubscale = new Map<string, number[]>();
  for (const a of answers) {
    const s = a.question.subscale;
    if (!s) continue;
    const arr = bySubscale.get(s) ?? [];
    arr.push(a.scoreSnapshot);
    bySubscale.set(s, arr);
  }

  const results: SubscaleResultInput[] = [];
  for (const [subscale, scores] of bySubscale) {
    const mean = scores.reduce((sum, v) => sum + v, 0) / scores.length;
    const applicable = bands.filter(
      (b) => b.subscale === subscale || b.subscale === null,
    );
    const matched = applicable.find((b) => mean >= b.minScore && mean <= b.maxScore);
    results.push({
      subscale,
      totalScore: mean,
      riskLevel: matched?.level ?? DEFAULT_LEVEL,
    });
  }

  return results;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const assessmentService = {
  start: async (userId: string, categoryId: string) => {
    const category = await categoryRepository.findById(categoryId);
    if (!category || !category.isActive) {
      throw new ApiError(404, 'Category not found');
    }

    const profile = await assessmentRepository.findPatientProfileByUserId(userId);
    if (!profile) {
      throw new ApiError(403, 'Only patients can start assessments');
    }

    const inProgress = await assessmentRepository.findInProgressFor(profile.id, categoryId);
    if (inProgress) {
      const answers = await assessmentRepository.listAnswersForSeed(inProgress.id);

      await authRepository.logActivity({
        actorId: userId,
        action: 'assessment_resumed',
        entityType: 'assessment',
        entityId: inProgress.id,
        metadata: { categoryId, categoryName: category.name },
      });

      return {
        id: inProgress.id,
        status: inProgress.status,
        startedAt: inProgress.startedAt,
        category: inProgress.category,
        resumed: true,
        answers,
      };
    }

    // No in-progress attempt — if the patient already submitted this category,
    // reopen that submission so they edit and resubmit instead of starting over.
    const lastCompleted = await assessmentRepository.findLatestCompletedFor(
      profile.id,
      categoryId,
    );
    if (lastCompleted) {
      const reopened = await assessmentRepository.reopenCompleted(lastCompleted.id);
      const answers = await assessmentRepository.listAnswersForSeed(reopened.id);

      await authRepository.logActivity({
        actorId: userId,
        action: 'assessment_reopened',
        entityType: 'assessment',
        entityId: reopened.id,
        metadata: { categoryId, categoryName: category.name },
      });

      return {
        id: reopened.id,
        status: reopened.status,
        startedAt: reopened.startedAt,
        category: reopened.category,
        resumed: true,
        answers,
      };
    }

    const assessment = await assessmentRepository.create(profile.id, categoryId);

    await authRepository.logActivity({
      actorId: userId,
      action: 'assessment_started',
      entityType: 'assessment',
      entityId: assessment.id,
      metadata: { categoryId, categoryName: category.name },
    });

    return {
      id: assessment.id,
      status: assessment.status,
      startedAt: assessment.startedAt,
      category: assessment.category,
      resumed: false,
      answers: [] as { questionId: string; selectedOptionId: string }[],
    };
  },

  submitAnswer: async (userId: string, assessmentId: string, input: SubmitAnswerInput) => {
    const profile = await assessmentRepository.findPatientProfileByUserId(userId);
    if (!profile) throw new ApiError(403, 'Only patients can submit answers');

    const assessment = await assessmentRepository.findByIdForPatient(assessmentId, profile.id);
    if (!assessment) throw new ApiError(404, 'Assessment not found');
    if (assessment.status !== 'in_progress') {
      throw new ApiError(409, 'Assessment is no longer in progress');
    }

    const option = await assessmentRepository.findOptionWithQuestionContext(
      input.questionId,
      input.selectedOptionId,
      assessment.categoryId,
    );
    if (!option) {
      throw new ApiError(422, 'Invalid question or option for this assessment');
    }

    // Reverse scoring applied at answer time (snapshot semantics): the score we
    // store in `score_snapshot` is the final, flipped value. Later edits to
    // option.score or question.is_reverse_scored don't change historical answers.
    let scoreSnapshot = option.score;
    if (option.question.isReverseScored) {
      const scores = option.question.options.map((o) => o.score);
      const maxS = Math.max(...scores);
      const minS = Math.min(...scores);
      scoreSnapshot = maxS + minS - option.score;
    }

    const answer = await assessmentRepository.upsertAnswer(
      assessmentId,
      input.questionId,
      input.selectedOptionId,
      scoreSnapshot,
    );

    return {
      id: answer.id,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      scoreSnapshot: answer.scoreSnapshot,
      answeredAt: answer.answeredAt,
    };
  },

  submit: async (userId: string, assessmentId: string) => {
    const profile = await assessmentRepository.findPatientProfileByUserId(userId);
    if (!profile) throw new ApiError(403, 'Only patients can submit assessments');

    const assessment = await assessmentRepository.findByIdForPatient(assessmentId, profile.id);
    if (!assessment) throw new ApiError(404, 'Assessment not found');
    if (assessment.status !== 'in_progress') {
      throw new ApiError(409, 'Assessment is no longer in progress');
    }

    const [answers, bandsRaw] = await Promise.all([
      assessmentRepository.getAnswersWithSubscale(assessmentId),
      assessmentRepository.getBandsForCategory(assessment.categoryId),
    ]);

    // Prisma returns Decimal for min/max score bounds; convert to number so
    // the scoring helpers can do plain arithmetic.
    const bands: Band[] = bandsRaw.map((b) => ({
      subscale: b.subscale,
      level: b.level,
      minScore: Number(b.minScore),
      maxScore: Number(b.maxScore),
    }));

    // Dispatch on the category's scoring recipe.
    let results: SubscaleResultInput[];
    switch (assessment.category.scoringType) {
      case 'total':
        results = computeTotal(answers, bands);
        break;
      case 'subscale_sum_cutoff':
        results = computeSubscaleSumCutoff(answers, bands);
        break;
      case 'subscale_mean_band':
        results = computeSubscaleMeanBand(answers, bands);
        break;
      default:
        throw new ApiError(
          500,
          `Unknown scoring_type on category: ${assessment.category.scoringType}`,
        );
    }

    // For 'total' assessments we expose the single level as overallRiskLevel.
    // For subscale-based assessments, there's no single "overall" — leave null.
    const overallRiskLevel =
      assessment.category.scoringType === 'total' ? results[0].riskLevel : null;

    const updated = await assessmentRepository.completeWithResults(
      assessmentId,
      assessment.categoryId,
      overallRiskLevel,
      results,
    );

    // Log a dashboard activity entry. If any subscale is 'high' or 'flagged'
    // we flag the whole assessment as high-risk for triage.
    const hasHighRisk = results.some(
      (r) => r.riskLevel === 'high' || r.riskLevel === FLAGGED_LEVEL || r.riskLevel === 'severe',
    );
    await authRepository.logActivity({
      actorId: userId,
      action: hasHighRisk ? 'flagged_high_risk' : 'assessment_completed',
      entityType: 'assessment',
      entityId: assessmentId,
      metadata: {
        categoryId: assessment.categoryId,
        scoringType: assessment.category.scoringType,
        results: results.map((r) => ({
          subscale: r.subscale,
          totalScore: r.totalScore,
          riskLevel: r.riskLevel,
        })),
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      startedAt: updated.startedAt,
      completedAt: updated.completedAt,
      overallRiskLevel: updated.overallRiskLevel,
      category: updated.category,
      scoringType: assessment.category.scoringType,
      results,
      answersCount: answers.length,
    };
  },

  listMine: async (userId: string, query: ListMyAssessmentsQuery) => {
    const profile = await assessmentRepository.findPatientProfileByUserId(userId);
    if (!profile) throw new ApiError(403, 'Only patients can view assessments');

    const rows = await assessmentRepository.listForPatient(profile.id, {
      status: query.status,
      categoryId: query.categoryId,
    });

    return rows.map((a) => ({
      id: a.id,
      status: a.status,
      overallRiskLevel: a.overallRiskLevel,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      category: a.category,
      results: a.categoryResults.map((r) => ({
        subscale: r.subscale,
        totalScore: Number(r.totalScore),
        riskLevel: r.riskLevel,
      })),
    }));
  },

  listForAdmin: async (query: ListAssessmentsAdminQuery) => {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const { total, rows } = await assessmentRepository.listForAdmin({
      patientId: query.patientId,
      categoryId: query.categoryId,
      status: query.status,
      skip,
      take: pageSize,
    });

    return {
      data: rows.map((a) => ({
        id: a.id,
        status: a.status,
        overallRiskLevel: a.overallRiskLevel,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        category: a.category,
        patient: {
          id: a.patient.id,
          fullName: a.patient.fullName,
          email: a.patient.user.email,
        },
        results: a.categoryResults.map((r) => ({
          subscale: r.subscale,
          totalScore: Number(r.totalScore),
          riskLevel: r.riskLevel,
        })),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  // Polymorphic summary for the admin patient-detail "Score Summary" card.
  // Reads pre-computed AssessmentCategoryResult rows and joins them to the
  // category's risk bands so the frontend can render the segment bars and
  // chip labels without additional lookups.
  getSummaryForAdmin: async (patientId: string, assessmentId: string) => {
    const a = await assessmentRepository.findSummaryForAdmin(assessmentId, patientId);
    if (!a) throw new ApiError(404, 'Assessment not found');

    type BandRow = {
      subscale: string | null;
      level: string;
      minScore: unknown;
      maxScore: unknown;
      label: string | null;
      color: string | null;
    };

    const bandsBySubscale = new Map<string | null, BandRow[]>();
    for (const b of a.category.riskBands) {
      const key = b.subscale;
      const arr = bandsBySubscale.get(key) ?? [];
      arr.push(b);
      bandsBySubscale.set(key, arr);
    }

    const serializeBands = (rows: BandRow[] | undefined) =>
      (rows ?? []).map((b) => ({
        level: b.level,
        label: b.label,
        color: b.color,
        minScore: Number(b.minScore),
        maxScore: Number(b.maxScore),
      }));

    const findBand = (rows: BandRow[] | undefined, level: string) =>
      (rows ?? []).find((b) => b.level === level) ?? null;

    // The "overall" score row may be stored with subscale = null (Recipe A) or
    // subscale = 'overall' (Recipe B). Recipe C has no overall row at all.
    const overallResult =
      a.categoryResults.find((r) => r.subscale === null) ??
      a.categoryResults.find((r) => r.subscale === 'overall') ??
      null;

    const subscaleResults = a.categoryResults.filter(
      (r) => r.subscale !== null && r.subscale !== 'overall',
    );

    // --- Total block ----------------------------------------------------
    let total: {
      score: number;
      maxScore: number | null;
      percent: number | null;
      band: string;
      label: string | null;
      color: string | null;
    } | null = null;

    if (overallResult) {
      const overallKey = overallResult.subscale; // null or 'overall'
      const overallBands = bandsBySubscale.get(overallKey) ?? [];
      const matched = findBand(overallBands, overallResult.riskLevel);
      const maxScore = overallBands.length
        ? Math.max(...overallBands.map((b) => Number(b.maxScore)))
        : null;
      const score = Number(overallResult.totalScore);
      const percent =
        maxScore && maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
      total = {
        score,
        maxScore,
        percent,
        band: overallResult.riskLevel,
        label: matched?.label ?? null,
        color: matched?.color ?? null,
      };
    }

    // --- Subscales block ------------------------------------------------
    const subscales = subscaleResults.map((r) => {
      const subBands = bandsBySubscale.get(r.subscale) ?? [];
      const matched = findBand(subBands, r.riskLevel);
      const maxScore = subBands.length
        ? Math.max(...subBands.map((b) => Number(b.maxScore)))
        : null;
      const score = Number(r.totalScore);
      const percent =
        maxScore && maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
      return {
        key: r.subscale as string,
        score,
        maxScore,
        percent,
        band: r.riskLevel,
        label: matched?.label ?? null,
        color: matched?.color ?? null,
        bands: serializeBands(subBands),
      };
    });

    // --- Band counts (for "1 Low, 2 Normal, 2 High" chip row) -----------
    const counts = new Map<string, number>();
    for (const s of subscales) {
      counts.set(s.band, (counts.get(s.band) ?? 0) + 1);
    }
    const subscaleCounts = Array.from(counts.entries()).map(([band, count]) => ({
      band,
      count,
    }));

    return {
      assessment: {
        id: a.id,
        status: a.status,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
      },
      category: {
        id: a.category.id,
        name: a.category.name,
        slug: a.category.slug,
        scoringType: a.category.scoringType,
      },
      total,
      subscales,
      subscaleCounts,
    };
  },

  // Admin patient-detail Q&A panel: paired question + selected-option list,
  // optionally filtered by attempted/not-attempted. Counts are always over
  // the full question set so the header chips don't shift with the filter.
  getAnswersForAdmin: async (
    patientId: string,
    assessmentId: string,
    filter: 'all' | 'answered' | 'not_attended',
  ) => {
    const a = await assessmentRepository.findAnswersForAdmin(assessmentId, patientId);
    if (!a) throw new ApiError(404, 'Assessment not found');

    const items = a.category.questions.map((q, idx) => {
      const ans = q.answers[0] ?? null;
      return {
        number: idx + 1,
        question: {
          id: q.id,
          text: q.questionText,
          type: q.questionType,
          subscale: q.subscale,
          isRequired: q.isRequired,
          isReverseScored: q.isReverseScored,
          displayOrder: q.displayOrder,
        },
        options: q.options,
        attempted: ans !== null,
        selectedOption: ans
          ? {
              id: ans.selectedOption.id,
              text: ans.selectedOption.optionText,
              score: ans.selectedOption.score,
              displayOrder: ans.selectedOption.displayOrder,
              scoreSnapshot: ans.scoreSnapshot,
              answeredAt: ans.answeredAt,
            }
          : null,
      };
    });

    const total = items.length;
    const answered = items.filter((i) => i.attempted).length;
    const notAttended = total - answered;

    const filtered =
      filter === 'answered'
        ? items.filter((i) => i.attempted)
        : filter === 'not_attended'
          ? items.filter((i) => !i.attempted)
          : items;

    return {
      assessment: {
        id: a.id,
        status: a.status,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
      },
      category: { id: a.category.id, name: a.category.name, slug: a.category.slug },
      counts: { answered, notAttended, total },
      items: filtered,
    };
  },

  getByIdForAdmin: async (id: string) => {
    const a = await assessmentRepository.findAdminDetail(id);
    if (!a) throw new ApiError(404, 'Assessment not found');

    return {
      id: a.id,
      status: a.status,
      overallRiskLevel: a.overallRiskLevel,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      category: a.category,
      patient: {
        id: a.patient.id,
        fullName: a.patient.fullName,
        phone: a.patient.phone,
        city: a.patient.city,
        email: a.patient.user.email,
      },
      answers: a.answers.map((ans) => ({
        id: ans.id,
        scoreSnapshot: ans.scoreSnapshot,
        answeredAt: ans.answeredAt,
        question: {
          id: ans.question.id,
          questionText: ans.question.questionText,
          subscale: ans.question.subscale,
          isReverseScored: ans.question.isReverseScored,
          displayOrder: ans.question.displayOrder,
        },
        selectedOption: {
          id: ans.selectedOption.id,
          optionText: ans.selectedOption.optionText,
          score: ans.selectedOption.score,
          displayOrder: ans.selectedOption.displayOrder,
        },
      })),
      results: a.categoryResults.map((r) => ({
        subscale: r.subscale,
        totalScore: Number(r.totalScore),
        riskLevel: r.riskLevel,
      })),
    };
  },

  getById: async (userId: string, assessmentId: string) => {
    const profile = await assessmentRepository.findPatientProfileByUserId(userId);
    if (!profile) throw new ApiError(403, 'Only patients can view assessments');

    const assessment = await assessmentRepository.findDetailForPatient(assessmentId, profile.id);
    if (!assessment) throw new ApiError(404, 'Assessment not found');

    return {
      id: assessment.id,
      status: assessment.status,
      startedAt: assessment.startedAt,
      completedAt: assessment.completedAt,
      overallRiskLevel: assessment.overallRiskLevel,
      category: assessment.category,
      answers: assessment.answers,
      results: assessment.categoryResults.map((r) => ({
        subscale: r.subscale,
        totalScore: Number(r.totalScore),
        riskLevel: r.riskLevel,
      })),
    };
  },
};
