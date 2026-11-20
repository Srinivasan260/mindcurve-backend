// HTML template for the admin patient PDF report.
// Mirrors the "sample.pdf" layout: patient header card, then one section per
// attended assessment with numbered Q&A. Orange accent color matches the UI.

export interface ReportPatient {
  displayId: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  email: string;
  addressLines: string[];
  registeredOn: string;
}

export interface ReportQuestion {
  number: number;
  text: string;
  optionText: string | null;
  score: number | null;
  attempted: boolean;
}

export interface ReportSection {
  categoryName: string;
  counts: { answered: number; notAttended: number; total: number };
  questions: ReportQuestion[];
}

export interface ReportData {
  patient: ReportPatient;
  generatedOn: string;
  sections: ReportSection[];
}

const escape = (s: string | null | undefined): string =>
  (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renderField = (label: string, value: string | null | undefined) => `
  <div class="field">
    <div class="field-label">${escape(label)}</div>
    <div class="field-value">${escape(value) || '-'}</div>
  </div>
`;

const renderQuestion = (q: ReportQuestion) => `
  <div class="qa-row">
    <div class="qa-num">${q.number}</div>
    <div class="qa-body">
      <div class="qa-text">${escape(q.text)}</div>
      <div class="qa-answer">
        ${
          q.attempted
            ? `<span class="qa-option">${escape(q.optionText)}</span>
               <span class="qa-score">Score ${q.score ?? 0}</span>`
            : `<span class="qa-not-attempted">Not attempted</span>`
        }
      </div>
    </div>
  </div>
`;

const renderSection = (s: ReportSection) => `
  <section class="asmt-section">
    <h2 class="asmt-title">${escape(s.categoryName)}</h2>
    <div class="asmt-counts">${s.counts.answered} answered · ${s.counts.notAttended} not attended · ${s.counts.total} questions</div>
    <div class="qa-list">
      ${s.questions.map(renderQuestion).join('')}
    </div>
  </section>
`;

export const renderReportHtml = (data: ReportData): string => {
  const { patient, sections, generatedOn } = data;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Assessment report - ${escape(patient.fullName)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1f2937;
    font-size: 11pt;
    line-height: 1.45;
    margin: 0;
  }
  h1 { font-size: 22pt; margin: 0 0 4px 0; font-weight: 700; }
  h2 { font-size: 14pt; margin: 0; font-weight: 700; }

  .byline { color: #6b7280; font-size: 10pt; margin-bottom: 16px; }

  .patient-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 14px 18px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
    margin-bottom: 28px;
  }
  .field-label { color: #6b7280; font-size: 9.5pt; }
  .field-value { color: #111827; font-size: 10.5pt; margin-top: 2px; }

  .asmt-section { margin-bottom: 20px; page-break-inside: auto; }
  .asmt-title {
    border-bottom: 3px solid #f97316;
    padding-bottom: 6px;
    margin-bottom: 8px;
    color: #111827;
  }
  .asmt-counts { color: #6b7280; font-size: 10pt; margin-bottom: 10px; }

  .qa-list { display: block; }
  .qa-row {
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f3f4f6;
    page-break-inside: avoid;
  }
  .qa-row:last-child { border-bottom: none; }
  .qa-num { color: #f97316; font-weight: 500; font-size: 10pt; text-align: right; padding-top: 2px; }
  .qa-text { color: #111827; margin-bottom: 4px; }
  .qa-answer { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .qa-option { color: #f97316; font-weight: 600; }
  .qa-score {
    color: #f97316;
    border: 1px solid #fed7aa;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 9pt;
  }
  .qa-not-attempted { color: #9ca3af; font-style: italic; }
</style>
</head>
<body>
  <h1>${escape(patient.fullName)}</h1>
  <div class="byline">Assessment report · Generated on ${escape(generatedOn)}</div>

  <div class="patient-card">
    ${renderField('Patient ID', patient.displayId)}
    ${renderField('Age / Gender', [patient.age ? `${patient.age} yrs` : null, patient.gender].filter(Boolean).join(', ') || null)}
    ${renderField('Phone', patient.phone)}
    ${renderField('Email', patient.email)}
    ${renderField('Address', patient.addressLines.join(', ') || null)}
    ${renderField('Registered on', patient.registeredOn)}
  </div>

  ${sections.map(renderSection).join('')}
</body>
</html>`;
};
