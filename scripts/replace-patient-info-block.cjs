#!/usr/bin/env node
// scripts/replace-patient-info-block.cjs
// ─────────────────────────────────────────────────────────────────────────────
// One-time script: replaces the "Patient info grid" block in
// LeftReportPanel.tsx with a compact single-row version (Case, MRN,
// Patient, DOB only -- Sex/Priority dropped from always-visible display
// per Pete's request), using CSS classes instead of inline styles.
//
// Uses exact line numbers (confirmed via PowerShell immediately before
// writing this script) rather than text matching, since the existing
// block contains corrupted em-dash bytes ('—' stored as 'â€”') that
// made reliable find/replace text-matching impossible in this file.
//
// Usage: node scripts/replace-patient-info-block.cjs
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'components', 'LeftReportPanel.tsx');

// 1-indexed, inclusive -- confirmed via Get-Content/Write-Host loop
const START_LINE = 215;
const END_LINE = 232;

const NEW_BLOCK = `          {/* Patient info row — compact single row, CAP two-identifier
              minimum (Pete: case number, MRN, Name, DOB). Sex/Priority
              dropped from always-visible display -- not patient
              identifiers, and keeping this simple rather than adding
              another toggle/overlay so soon after removing the broken
              full-screen review feature. Case number kept even though
              it's a case (not patient) identifier -- it's what ties this
              panel to a specific specimen while scrolling a long report. */}
          <div className="ps-patient-info-row">
            {[
              { label: 'Case',    value: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '—', mono: true },
              { label: 'MRN',     value: caseData.patient?.mrn ?? '—' },
              { label: 'Patient', value: caseData.patient ? \`\${caseData.patient.lastName}, \${caseData.patient.firstName}\` : '—' },
              { label: 'DOB',     value: caseData.patient?.dateOfBirth ? new Date(caseData.patient.dateOfBirth).toLocaleDateString() : '—' },
            ].map(({ label, value, mono }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="ps-patient-info-sep">·</span>}
                <span className="ps-patient-info-label">{label}</span>
                <span className={\`ps-patient-info-value\${mono ? ' ps-patient-info-value--mono' : ''}\`}>{value}</span>
              </React.Fragment>
            ))}
          </div>`;

function main() {
  const original = fs.readFileSync(TARGET_FILE, 'utf8');
  const lines = original.split('\n');

  // Validate before making any changes
  const firstLine = lines[START_LINE - 1] ?? '';
  const lastLine = lines[END_LINE - 1] ?? '';
  if (!firstLine.includes('Patient info grid')) {
    console.error(`ABORTING: line ${START_LINE} does not contain "Patient info grid".`);
    console.error(`Actual content: ${firstLine}`);
    process.exit(1);
  }
  if (lastLine.trim() !== '</div>') {
    console.error(`ABORTING: line ${END_LINE} is not the expected closing "</div>".`);
    console.error(`Actual content: ${lastLine}`);
    process.exit(1);
  }
  console.log('Validation passed. Proceeding with replacement.');

  const before = lines.slice(0, START_LINE - 1);
  const after = lines.slice(END_LINE);
  const result = [...before, NEW_BLOCK, ...after].join('\n');

  fs.writeFileSync(TARGET_FILE, result, 'utf8');
  console.log(`Replaced lines ${START_LINE}-${END_LINE} with the new compact patient info row.`);
  console.log('Run `npx tsc --noEmit -p .` next to verify.');
}

main();
