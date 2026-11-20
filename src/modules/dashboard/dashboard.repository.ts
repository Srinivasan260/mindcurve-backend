import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

interface DayCountRow {
  day: Date;
  count: bigint;
}

interface CategoryRiskRow {
  categoryId: string;
  categoryName: string;
  riskLevel: string;
  cnt: bigint;
}

interface PatientRiskBucketRow {
  bucket: 'low' | 'moderate' | 'high';
  cnt: bigint;
}

export const dashboardRepository = {
  countCompletedAssessmentsSince: (sinceInclusive: Date, untilExclusive?: Date) =>
    prisma.assessment.count({
      where: {
        status: 'completed',
        completedAt: {
          gte: sinceInclusive,
          ...(untilExclusive ? { lt: untilExclusive } : {}),
        },
      },
    }),

  countPatientsTotal: () => prisma.patientProfile.count(),

  countPatientsSince: (since: Date) =>
    prisma.patientProfile.count({ where: { createdAt: { gte: since } } }),

  countFollowUps: (where: { priority?: 'high'; status?: 'pending' }) =>
    prisma.followUp.count({ where }),

  // Patient-level risk distribution: one row per patient, bucketed by their
  // worst result across all assessments. Raw clinical labels from every scale
  // are folded into three UI buckets (low / moderate / high) so the dashboard
  // card is scale-agnostic. Patients with no results are excluded.
  patientRiskBuckets: () =>
    prisma.$queryRaw<PatientRiskBucketRow[]>(Prisma.sql`
      SELECT
        CASE severity_rank
          WHEN 3 THEN 'high'
          WHEN 2 THEN 'moderate'
          ELSE 'low'
        END AS bucket,
        COUNT(*) AS cnt
      FROM (
        SELECT
          a.patient_id,
          MAX(
            CASE r.risk_level
              WHEN 'high'      THEN 3
              WHEN 'severe'    THEN 3
              WHEN 'average'   THEN 2
              WHEN 'mild'      THEN 2
              WHEN 'moderate'  THEN 2
              WHEN 'flagged'   THEN 2
              WHEN 'low'       THEN 1
              WHEN 'normal'    THEN 1
              WHEN 'no_autism' THEN 1
              ELSE 0
            END
          ) AS severity_rank
        FROM assessment_category_results r
        JOIN assessments a ON a.id = r.assessment_id
        GROUP BY a.patient_id
      ) per_patient
      GROUP BY severity_rank
    `),

  // Per-category + per-risk-level breakdown (join with category name via raw SQL
  // to keep it a single round-trip).
  categoryRiskBreakdown: () =>
    prisma.$queryRaw<CategoryRiskRow[]>(Prisma.sql`
      SELECT
        c.id         AS categoryId,
        c.name       AS categoryName,
        r.risk_level AS riskLevel,
        COUNT(*)     AS cnt
      FROM assessment_category_results r
      JOIN categories c ON c.id = r.category_id
      GROUP BY c.id, c.name, r.risk_level
      ORDER BY c.display_order ASC, c.name ASC
    `),

  // Last N days of completed assessments (one row per day with count)
  assessmentsByDay: (days: number) =>
    prisma.$queryRaw<DayCountRow[]>(Prisma.sql`
      SELECT
        DATE(completed_at) AS day,
        COUNT(*)           AS count
      FROM assessments
      WHERE status = 'completed'
        AND completed_at >= DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)
      GROUP BY DATE(completed_at)
      ORDER BY day ASC
    `),

  recentActivity: (take: number) =>
    prisma.activityLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
            patientProfile: { select: { fullName: true } },
          },
        },
      },
    }),
};

export type DashboardRepository = typeof dashboardRepository;
