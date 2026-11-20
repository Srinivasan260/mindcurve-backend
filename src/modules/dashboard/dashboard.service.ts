import { dashboardRepository } from './dashboard.repository.js';

// --- date helpers (keeps the service tight) ---------------------------------

const startOfTodayUtc = (): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const startOfIsoWeek = (ref: Date = new Date()): Date => {
  const d = new Date(ref);
  d.setUTCHours(0, 0, 0, 0);
  // getUTCDay(): 0=Sun..6=Sat → convert so Monday=0, Sunday=6
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
};

const startOfMonth = (ref: Date = new Date()): Date =>
  new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));

const daysAgoUtc = (n: number): Date => {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

const pct = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((part / total) * 100);

const pctChange = (current: number, previous: number): number => {
  if (previous === 0) return 0; // no prior baseline — report 0% instead of null
  return Math.round(((current - previous) / previous) * 100);
};

// ----------------------------------------------------------------------------

export const dashboardService = {
  getSummary: async (days = 7) => {
    const thisWeekStart = startOfIsoWeek();
    const prevWeekStart = daysAgoUtc(7 + ((new Date().getUTCDay() + 6) % 7));
    const monthStart = startOfMonth();

    const [
      assessmentsThisWeek,
      assessmentsPrevWeek,
      totalPatients,
      patientsThisMonth,
      highRiskTotal,
      highRiskPending,
      patientRiskBucketsRaw,
      categoryBreakdownRaw,
      assessmentsByDayRaw,
      recentActivity,
    ] = await Promise.all([
      dashboardRepository.countCompletedAssessmentsSince(thisWeekStart),
      dashboardRepository.countCompletedAssessmentsSince(prevWeekStart, thisWeekStart),
      dashboardRepository.countPatientsTotal(),
      dashboardRepository.countPatientsSince(monthStart),
      dashboardRepository.countFollowUps({ priority: 'high' }),
      dashboardRepository.countFollowUps({ priority: 'high', status: 'pending' }),
      dashboardRepository.patientRiskBuckets(),
      dashboardRepository.categoryRiskBreakdown(),
      dashboardRepository.assessmentsByDay(days),
      dashboardRepository.recentActivity(20),
    ]);

    // Patient-level risk distribution: one row per patient, placed in their
    // worst bucket. Always emit all three buckets (zero-filled) so the UI
    // layout stays stable even when a bucket is empty.
    const bucketCounts: Record<'low' | 'moderate' | 'high', number> = {
      low: 0,
      moderate: 0,
      high: 0,
    };
    for (const row of patientRiskBucketsRaw) {
      bucketCounts[row.bucket] = Number(row.cnt);
    }
    const assessedPatients = bucketCounts.low + bucketCounts.moderate + bucketCounts.high;
    const riskDistribution = (['low', 'moderate', 'high'] as const).map((level) => ({
      level,
      count: bucketCounts[level],
      percent: pct(bucketCounts[level], assessedPatients),
    }));

    // Per-category breakdown → pivot so each row has one category and a map of level → count
    const byCategory = new Map<
      string,
      { categoryId: string; categoryName: string; counts: Record<string, number>; total: number }
    >();
    for (const row of categoryBreakdownRaw) {
      const cnt = Number(row.cnt);
      const bucket = byCategory.get(row.categoryId) ?? {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        counts: {},
        total: 0,
      };
      bucket.counts[row.riskLevel] = (bucket.counts[row.riskLevel] ?? 0) + cnt;
      bucket.total += cnt;
      byCategory.set(row.categoryId, bucket);
    }
    const riskByCategory = Array.from(byCategory.values());

    // Fill missing days in the trend with 0 so the chart has a point per day.
    const dailyMap = new Map<string, number>();
    for (const r of assessmentsByDayRaw) {
      const key = new Date(r.day).toISOString().slice(0, 10);
      dailyMap.set(key, Number(r.count));
    }
    const trend: Array<{ day: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = daysAgoUtc(i);
      const key = d.toISOString().slice(0, 10);
      trend.push({ day: key, count: dailyMap.get(key) ?? 0 });
    }

    const activity = recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      metadata: a.metadata,
      createdAt: a.createdAt,
      actor: a.actor
        ? {
            id: a.actor.id,
            email: a.actor.email,
            role: a.actor.role,
            fullName: a.actor.patientProfile?.fullName ?? null,
          }
        : null,
    }));

    return {
      kpis: {
        assessmentsThisWeek: {
          count: assessmentsThisWeek,
          previousWeekCount: assessmentsPrevWeek,
          changePercent: pctChange(assessmentsThisWeek, assessmentsPrevWeek),
        },
        registeredPatients: {
          total: totalPatients,
          addedThisMonth: patientsThisMonth,
        },
        highRiskFollowUps: {
          total: highRiskTotal,
          pendingCallback: highRiskPending,
        },
        riskDistribution,
      },
      assessmentsByDay: trend,
      riskByCategory,
      activity,
    };
  },
};
