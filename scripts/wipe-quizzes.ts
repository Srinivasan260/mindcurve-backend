/**
 * Wipe every quiz from the DB.
 *
 *   Deletes, in FK-safe order:
 *     AssessmentCategoryResult → Answer → Assessment
 *     → CategoryRiskBand → QuestionOption → Question → Category
 *
 *   Also drops ClinicalNote + FollowUp rows that reference any assessment,
 *   because both are nullable on assessmentId but their patient references
 *   cascade — we want a true "blank slate for quizzes" state, not orphan notes.
 *
 * Usage:
 *   npm run wipe:quizzes -- --yes
 *   npm run wipe:quizzes -- --dry
 *
 * Patients + admin users are NOT touched.
 */
import { prisma } from '../src/config/prisma.js';

const args = new Set(process.argv.slice(2));
const dry = args.has('--dry') || args.has('--dry-run');
const yes = args.has('--yes') || args.has('-y');

async function main() {
  const before = await prisma.$transaction([
    prisma.category.count(),
    prisma.question.count(),
    prisma.questionOption.count(),
    prisma.categoryRiskBand.count(),
    prisma.assessment.count(),
    prisma.answer.count(),
    prisma.assessmentCategoryResult.count(),
    prisma.followUp.count(),
    prisma.clinicalNote.count(),
  ]);
  const [cats, qs, opts, bands, asmts, ans, results, follows, notes] = before;

  console.log('Current counts:');
  console.table({
    categories: cats,
    questions: qs,
    options: opts,
    risk_bands: bands,
    assessments: asmts,
    answers: ans,
    results,
    follow_ups: follows,
    clinical_notes: notes,
  });

  if (cats === 0 && asmts === 0) {
    console.log('Nothing to wipe. Done.');
    return;
  }

  if (dry) {
    console.log('\n[dry] no rows deleted. Re-run with --yes to actually wipe.');
    return;
  }

  if (!yes) {
    console.log(
      '\nRefusing to wipe without --yes.\n' +
        '  npm run wipe:quizzes -- --dry   (preview)\n' +
        '  npm run wipe:quizzes -- --yes   (actually wipe)',
    );
    process.exitCode = 1;
    return;
  }

  console.log('\nWiping…');
  await prisma.$transaction(async (tx) => {
    // Notes + follow-ups that reference assessments (SetNull on assessment is
    // fine, but we're nuking everything quiz-related — simpler + cleaner.)
    await tx.followUp.deleteMany({ where: { assessmentId: { not: null } } });
    await tx.clinicalNote.deleteMany({ where: { assessmentId: { not: null } } });

    // Scoring rows reference categories/assessments with onDelete: Restrict,
    // so delete them before the parents.
    await tx.assessmentCategoryResult.deleteMany({});
    await tx.answer.deleteMany({});
    await tx.assessment.deleteMany({});

    // Category cascade handles Question → Option and RiskBand.
    await tx.category.deleteMany({});
  });

  const after = await prisma.$transaction([
    prisma.category.count(),
    prisma.assessment.count(),
  ]);
  console.log('\nAfter wipe:');
  console.table({ categories: after[0], assessments: after[1] });
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('Wipe failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
