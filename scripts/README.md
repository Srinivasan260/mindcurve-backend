# Quiz seeding scripts

Two small CLIs for managing assessment categories (quizzes) in a dev DB, without touching patients or admins.

- **`wipe:quizzes`** — nuke every Category + its scoring data. Admin + patient accounts are preserved.
- **`seed:quiz`** — import one quiz from a JSON file into the DB.

Both run via `tsx` (no build step).

---

## Install

Already installed — `tsx`, `zod`, and `@prisma/client` are existing deps. No extra packages needed.

---

## Wipe everything quiz-related

```bash
npm run wipe:quizzes -- --dry   # preview current counts, delete nothing
npm run wipe:quizzes -- --yes   # actually delete
```

What it deletes, in FK-safe order:

```
AssessmentCategoryResult → Answer → Assessment
→ Category (cascades to Question → QuestionOption, and CategoryRiskBand)
```

Follow-ups and clinical notes that reference an assessment are also removed (nullable FKs would otherwise leave orphan refs). Patient profiles and the admin user are not touched.

---

## Seed one quiz

```bash
npm run seed:quiz -- scripts/examples/phq-9.json
npm run seed:quiz -- scripts/examples/phq-9.json --replace          # drop existing slug first
npm run seed:quiz -- scripts/examples/phq-9.json --as admin@athma.com
```

Rules:

- The script needs a `User` with `role='admin'` to own the category (FK `Category.createdBy`). If several exist and you want a specific one, pass `--as <email>`.
- If a category with the same `slug` exists, you must pass `--replace` or the script will abort.
- The whole import runs in **one Prisma `$transaction`** — any error rolls back everything.

---

## JSON schema (per quiz)

```jsonc
{
  "name": "Patient Health Questionnaire (PHQ-9)",
  "slug": "phq-9",                           // unique
  "description": "...",                      // optional
  "scoringType": "total",                    // total | subscale_sum_cutoff | subscale_mean_band
  "displayOrder": 1,                         // optional, default 0
  "isActive": true,                          // optional, default true

  "questions": [
    {
      "text": "Little interest or pleasure in doing things",
      "type": "single_choice",               // optional, default single_choice (also: multi_choice, scale)
      "subscale": null,                      // null for `total`; required string for subscale types
      "isReverseScored": false,              // optional, default false
      "isRequired": true,                    // optional, default true
      "isActive": true,                      // optional, default true
      "displayOrder": 1,                     // optional, auto-assigned from array index if omitted

      "options": [                           // 2-7 items, required
        { "text": "Not at all",              "score": 0, "displayOrder": 0 },
        { "text": "Several days",            "score": 1, "displayOrder": 1 },
        { "text": "More than half the days", "score": 2, "displayOrder": 2 },
        { "text": "Nearly every day",        "score": 3, "displayOrder": 3 }
      ]
    }
  ],

  "riskBands": [                             // min 1 band
    { "level": "none",     "minScore": 0,  "maxScore": 4,  "label": "None",     "color": "#7BB661", "subscale": null },
    { "level": "mild",     "minScore": 5,  "maxScore": 9,  "label": "Mild",     "color": "#F8B978", "subscale": null },
    { "level": "moderate", "minScore": 10, "maxScore": 14, "label": "Moderate", "color": "#EF6B1A", "subscale": null },
    { "level": "severe",   "minScore": 15, "maxScore": 27, "label": "Severe",   "color": "#7A2E09", "subscale": null }
  ]
}
```

### Rules the seeder enforces before writing

| Check | Applies to |
|---|---|
| Every question must have 2–7 options | all quizzes |
| `scoringType=total` → **no** `subscale` on questions, **no** `subscale` on bands | total |
| `scoringType=subscale_*` → **every** question must have a `subscale` | subscale types |
| Risk bands per `subscale` must not overlap (`minScore` ≤ previous `maxScore`) | all quizzes |
| `(subscale, level)` must be unique per band set | all quizzes |

### Per-scoringType band shape

| scoringType | Band set required |
|---|---|
| `total` | One set of bands, all with `subscale: null`, covering the full possible total |
| `subscale_sum_cutoff` | Bands per subscale + an "overall" band set (use `subscale: "overall"` or similar — the backend reads bands by subscale value) |
| `subscale_mean_band` | Bands per subscale, floats allowed for `minScore` / `maxScore` (e.g. 2.51–3.5) |

---

## End-to-end workflow

```bash
# From backend/
npm run wipe:quizzes -- --yes
npm run seed:quiz -- scripts/examples/phq-9.json
npm run seed:quiz -- scripts/examples/gad-7.json
npm run seed:quiz -- scripts/examples/bfi-10.json
```

Then in the admin frontend:
- **Questions & Answers** tab → see the three new cards + their questions
- Log in as a patient on the user frontend, take one of the quizzes → the **Overview** dashboard will reflect it (donut, assessments-by-day, latest activity)

---

## Examples shipped (the six Athma clinic quizzes)

| File | Full name | Scoring | Notes |
|---|---|---|---|
| [`examples/beis-10.json`](examples/beis-10.json) | Brief Emotional Intelligence Scale (BEIS-10) | `subscale_mean_band` | 10 Q, 4 subscales |
| [`examples/mhi-38.json`](examples/mhi-38.json)   | Mental Health Inventory (MHI-38) | `subscale_mean_band` | 38 Q, 5 subscales, 3 reverse-scored items |
| [`examples/scared.json`](examples/scared.json)   | SCARED Rating Scale | `subscale_sum_cutoff` | 41 Q, 5 subscales + overall cutoff |
| [`examples/isaa.json`](examples/isaa.json)       | Indian Scale for Assessment of Autism | `total` | 40 Q, severity bands |
| [`examples/gds-sf.json`](examples/gds-sf.json)   | Geriatric Depression Scale (Short Form) | `total` | 15 Y/N, 5 reverse-scored items |
| [`examples/bfi-10.json`](examples/bfi-10.json)   | Big Five Inventory-10 (BFI-10) | `subscale_mean_band` | 10 Q, 5 traits, 6 reverse-scored items |

## Seed all six at once

```bash
npm run seed:all -- --wipe           # wipe + re-seed everything
npm run seed:all                     # re-seed all (uses --replace per file)
npm run seed:all -- --as admin@athma.com
```

Item wording in `mhi-38.json`, `scared.json`, `isaa.json` follows the publicly documented versions of each instrument. If your clinic uses a translated or clinic-specific wording, edit the `text` fields in the JSON and re-run `npm run seed:quiz -- <file>` for that quiz only.
