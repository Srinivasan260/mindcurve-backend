/**
 * NUCLEAR wipe — leaves the DB empty except for admin/doctor User rows.
 *
 * Deletes, in FK-safe order:
 *   AssessmentCategoryResult → Answer → FollowUp → ClinicalNote → Assessment
 *   → Category (cascades Question → Option, and RiskBand)
 *   → ActivityLog
 *   → PatientProfile → User (role = patient)   (EmailToken cascades off User)
 *
 * Also deletes every file in scripts/examples/ so stale JSON can't be
 * accidentally re-seeded.
 *
 * Usage:
 *   npm run wipe:all -- --dry    (preview counts, nothing deleted)
 *   npm run wipe:all -- --yes    (actually wipe)
 *
 * Keeps: User rows where role IN ('admin', 'doctor').
 */
import { readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/config/prisma.js';

const args = new Set(process.argv.slice(2));
const dry = args.has('--dry') || args.has('--dry-run');
const yes = args.has('--yes') || args.has('-y');

const EXAMPLES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'examples');

async function main() {
  const [
    cats,
    qs,
    opts,
    bands,
    asmts,
    ans,
    results,
    follows,
    notes,
    activity,
    patients,
    nonStaffUsers,
    staffUsers,
  ] = await prisma.$transaction([
    prisma.category.count(),
    prisma.question.count(),
    prisma.questionOption.count(),
    prisma.categoryRiskBand.count(),
    prisma.assessment.count(),
    prisma.answer.count(),
    prisma.assessmentCategoryResult.count(),
    prisma.followUp.count(),
    prisma.clinicalNote.count(),
    prisma.activityLog.count(),
    prisma.patientProfile.count(),
    prisma.user.count({ where: { role: { notIn: ['admin', 'doctor'] } } }),
    prisma.user.count({ where: { role: { in: ['admin', 'doctor'] } } }),
  ]);

  const exampleFiles = existsSync(EXAMPLES_DIR)
    ? readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.json'))
    : [];

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
    activity_logs: activity,
    patient_profiles: patients,
    'users (non-staff) ← will DELETE': nonStaffUsers,
    'users (admin + doctor) ← KEEP': staffUsers,
    'scripts/examples/*.json ← will DELETE': exampleFiles.length,
  });

  if (dry) {
    console.log('\n[dry] no rows deleted, no files removed. Re-run with --yes to actually wipe.');
    return;
  }

  if (!yes) {
    console.log(
      '\nRefusing to wipe without --yes.\n' +
        '  npm run wipe:all -- --dry   (preview)\n' +
        '  npm run wipe:all -- --yes   (actually wipe)',
    );
    process.exitCode = 1;
    return;
  }

  console.log('\nWiping DB…');
  await prisma.$transaction(async (tx) => {
    // Scoring + Q&A (must come before Category / Assessment)
    await tx.assessmentCategoryResult.deleteMany({});
    await tx.answer.deleteMany({});

    // Anything referencing Assessment or PatientProfile
    await tx.followUp.deleteMany({});
    await tx.clinicalNote.deleteMany({});

    await tx.assessment.deleteMany({});

    // Category cascade handles Question → Option and RiskBand
    await tx.category.deleteMany({});

    // Full activity history
    await tx.activityLog.deleteMany({});

    // Patient tree: User delete cascades to PatientProfile + EmailToken
    await tx.user.deleteMany({ where: { role: { notIn: ['admin', 'doctor'] } } });
  });

  // Delete seed JSON files AFTER the DB wipe succeeds, so a mid-wipe
  // failure doesn't leave the repo in a weird state.
  console.log('\nDeleting example seed JSONs…');
  for (const f of exampleFiles) {
    const p = join(EXAMPLES_DIR, f);
    unlinkSync(p);
    console.log(`  - ${f}`);
  }

  const [catsAfter, asmtsAfter, patientsAfter, staffAfter] = await prisma.$transaction([
    prisma.category.count(),
    prisma.assessment.count(),
    prisma.patientProfile.count(),
    prisma.user.count({ where: { role: { in: ['admin', 'doctor'] } } }),
  ]);

  console.log('\nAfter wipe:');
  console.table({
    categories: catsAfter,
    assessments: asmtsAfter,
    patients: patientsAfter,
    staff_users_kept: staffAfter,
  });
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('Wipe failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
