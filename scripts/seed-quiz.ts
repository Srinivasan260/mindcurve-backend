/**
 * Seed one quiz from a JSON file.
 *
 *   npm run seed:quiz -- scripts/examples/phq-9.json
 *   npm run seed:quiz -- scripts/examples/phq-9.json --replace   # drop existing slug first
 *   npm run seed:quiz -- scripts/examples/phq-9.json --as admin@athma.com
 *
 * Writes, in a single transaction:
 *   Category → Question[] → QuestionOption[] → CategoryRiskBand[]
 *
 * JSON shape — see scripts/README.md.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import { prisma } from '../src/config/prisma.js';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const scoringTypes = ['total', 'subscale_sum_cutoff', 'subscale_mean_band'] as const;
const questionTypes = ['single_choice', 'multi_choice', 'scale'] as const;

const optionSchema = z.object({
  text: z.string().min(1),
  score: z.number().int(),
  displayOrder: z.number().int().optional(),
});

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(questionTypes).optional().default('single_choice'),
  subscale: z.string().nullable().optional(),
  isReverseScored: z.boolean().optional().default(false),
  isRequired: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().optional(),
  options: z.array(optionSchema).min(2).max(7),
});

const bandSchema = z.object({
  subscale: z.string().nullable().optional(),
  level: z.string().min(1),
  minScore: z.number(),
  maxScore: z.number(),
  label: z.string().optional(),
  color: z.string().optional(),
});

const quizSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  scoringType: z.enum(scoringTypes).default('total'),
  displayOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
  questions: z.array(questionSchema).min(1),
  riskBands: z.array(bandSchema).min(1),
});

type Quiz = z.infer<typeof quizSchema>;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.length === 0 || argv[0].startsWith('--')) {
  console.error('Usage: npm run seed:quiz -- <path-to-quiz.json> [--replace] [--as <email>]');
  process.exit(1);
}
const filePath = resolve(process.cwd(), argv[0]);
const replace = argv.includes('--replace');
const asEmailIdx = argv.indexOf('--as');
const asEmail = asEmailIdx >= 0 ? argv[asEmailIdx + 1] : undefined;

// ---------------------------------------------------------------------------
// Pre-flight validation beyond Zod
// ---------------------------------------------------------------------------
function assertConsistent(quiz: Quiz): void {
  const subscaleBased =
    quiz.scoringType === 'subscale_sum_cutoff' ||
    quiz.scoringType === 'subscale_mean_band';

  // Subscale-based scoring needs at least one subscaled question, but individual
  // items may be filler (subscale: null) — e.g. MHI-38 items 2, 22, 38 are
  // administered to patients but not counted in any subscale sum.
  if (subscaleBased) {
    const anySubscaled = quiz.questions.some((q) => q.subscale);
    if (!anySubscaled) {
      throw new Error(
        `scoringType=${quiz.scoringType} but no question has a subscale.`,
      );
    }
  } else {
    // 'total' → no subscale tags on questions, bands must have subscale=null
    const tagged = quiz.questions.filter((q) => q.subscale);
    if (tagged.length) {
      throw new Error(
        `scoringType=total but ${tagged.length} question(s) are tagged with a subscale.`,
      );
    }
    const scopedBand = quiz.riskBands.find((b) => b.subscale);
    if (scopedBand) {
      throw new Error(
        `scoringType=total but a band is scoped to subscale="${scopedBand.subscale}". Use subscale=null for total scoring.`,
      );
    }
  }

  // Band overlap check within the same subscale
  const grouped = new Map<string, typeof quiz.riskBands>();
  for (const b of quiz.riskBands) {
    const key = b.subscale ?? '__null__';
    const arr = grouped.get(key) ?? [];
    arr.push(b);
    grouped.set(key, arr);
  }
  for (const [key, bands] of grouped) {
    const sorted = [...bands].sort((a, b) => a.minScore - b.minScore);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].minScore <= sorted[i - 1].maxScore) {
        throw new Error(
          `Overlapping risk bands for subscale="${key === '__null__' ? 'null' : key}": ` +
            `${sorted[i - 1].level}(${sorted[i - 1].minScore}–${sorted[i - 1].maxScore}) ` +
            `overlaps ${sorted[i].level}(${sorted[i].minScore}–${sorted[i].maxScore})`,
        );
      }
    }
  }

  // Band levels must be unique per subscale (DB has a unique constraint)
  for (const [key, bands] of grouped) {
    const levels = bands.map((b) => b.level.toLowerCase());
    const dup = levels.find((l, i) => levels.indexOf(l) !== i);
    if (dup) {
      throw new Error(
        `Duplicate band level "${dup}" for subscale="${key === '__null__' ? 'null' : key}"`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Reading ${filePath}`);
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const parsed = quizSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('JSON failed validation:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
  }
  const quiz = parsed.data;
  assertConsistent(quiz);

  // Find an admin to own the category (required FK)
  const creator = asEmail
    ? await prisma.user.findUnique({ where: { email: asEmail } })
    : await prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { createdAt: 'asc' } });
  if (!creator) {
    throw new Error(
      asEmail
        ? `No user with email ${asEmail}`
        : 'No admin user found. Create one or pass --as <email>.',
    );
  }
  if (creator.role !== 'admin' && creator.role !== 'doctor') {
    console.warn(`[warn] creator ${creator.email} is role=${creator.role}; proceeding anyway.`);
  }

  // If the slug exists, optionally drop it first
  const existing = await prisma.category.findUnique({ where: { slug: quiz.slug } });
  if (existing && !replace) {
    throw new Error(
      `Category "${quiz.slug}" already exists. Re-run with --replace to overwrite.`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    if (existing && replace) {
      console.log(`Replacing existing "${quiz.slug}" (${existing.id})…`);
      // Child rows are Restrict on assessments — detach by nuking them.
      await tx.assessmentCategoryResult.deleteMany({ where: { categoryId: existing.id } });
      await tx.answer.deleteMany({
        where: { assessment: { categoryId: existing.id } },
      });
      await tx.assessment.deleteMany({ where: { categoryId: existing.id } });
      await tx.category.delete({ where: { id: existing.id } });
    }

    const category = await tx.category.create({
      data: {
        name: quiz.name,
        slug: quiz.slug,
        description: quiz.description,
        scoringType: quiz.scoringType,
        displayOrder: quiz.displayOrder,
        isActive: quiz.isActive,
        createdBy: creator.id,
      },
    });

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      await tx.question.create({
        data: {
          categoryId: category.id,
          questionText: q.text,
          questionType: q.type,
          subscale: q.subscale ?? null,
          isReverseScored: q.isReverseScored,
          isRequired: q.isRequired,
          isActive: q.isActive,
          displayOrder: q.displayOrder ?? i + 1,
          options: {
            create: q.options.map((opt, j) => ({
              optionText: opt.text,
              score: opt.score,
              displayOrder: opt.displayOrder ?? j,
            })),
          },
        },
      });
    }

    await tx.categoryRiskBand.createMany({
      data: quiz.riskBands.map((b) => ({
        categoryId: category.id,
        subscale: b.subscale ?? null,
        level: b.level,
        minScore: b.minScore,
        maxScore: b.maxScore,
        label: b.label,
        color: b.color,
      })),
    });

    return category;
  }, { maxWait: 60000, timeout: 120000 });

  const counts = await prisma.$transaction([
    prisma.question.count({ where: { categoryId: result.id } }),
    prisma.categoryRiskBand.count({ where: { categoryId: result.id } }),
  ]);
  console.log('\nSeeded:');
  console.table({
    category: result.name,
    slug: result.slug,
    scoringType: result.scoringType,
    questions: counts[0],
    riskBands: counts[1],
  });
}

main()
  .catch((err) => {
    console.error('\nSeed failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
