#!/usr/bin/env node
// scripts/undo-leftreportpanel-chevron.cjs
// One-time script: removes the isPatientInfoExpanded chevron/collapse
// feature from LeftReportPanel.tsx, restoring the simple version that
// always shows Case/MRN/Patient/DOB + the Biomarkers card, with no
// toggle. CRLF-safe (see earlier scripts tonight for why).

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'components', 'LeftReportPanel.tsx');

const UNDOS = [
  [
    `  // Collapses (not hides) the patient banner to recover vertical space for
  // the report/synoptic sections below -- matches the case-alert-banner
  // chevron pattern, but running the opposite direction (starts expanded,
  // collapses to a compact summary). Always keeps Case+MRN+Patient visible
  // even collapsed, since dropping MRN too would fall below the two-
  // identifier minimum discussed for this panel; only DOB and the
  // Biomarkers card collapse away.
  const [isPatientInfoExpanded, setIsPatientInfoExpanded] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);`,
    `  const scrollRef = React.useRef<HTMLDivElement>(null);`,
    'Remove isPatientInfoExpanded state',
  ],
  [
    `          <div className="ps-patient-info-row">
            {[
              { label: 'Case',    value: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '—', mono: true },
              { label: 'MRN',     value: caseData.patient?.mrn ?? '—' },
              { label: 'Patient', value: caseData.patient ? \`\${caseData.patient.lastName}, \${caseData.patient.firstName}\` : '—' },
              ...(isPatientInfoExpanded ? [{ label: 'DOB', value: caseData.patient?.dateOfBirth ? new Date(caseData.patient.dateOfBirth).toLocaleDateString() : '—', mono: false }] : []),
            ].map(({ label, value, mono }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="ps-patient-info-sep">·</span>}
                <span className="ps-patient-info-label">{label}</span>
                <span className={\`ps-patient-info-value\${mono ? ' ps-patient-info-value--mono' : ''}\`}>{value}</span>
              </React.Fragment>
            ))}
            <span
              className={\`ps-patient-info-chevron\${isPatientInfoExpanded ? ' ps-patient-info-chevron--expanded' : ''}\`}
              onClick={() => setIsPatientInfoExpanded(e => !e)}
              title={isPatientInfoExpanded ? 'Collapse — more room for the report' : 'Show DOB & biomarkers'}
            >▼</span>
          </div>

          {isPatientInfoExpanded && <MarkersPanel markers={markers} />}`,
    `          <div className="ps-patient-info-row">
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
          </div>

          <MarkersPanel markers={markers} />`,
    'Restore the always-full patient info row and unconditional MarkersPanel',
  ],
];

function main() {
  const raw = fs.readFileSync(FILE, 'utf8');
  let content = raw.replace(/\r\n/g, '\n');

  for (const [find, restoreTo, desc] of UNDOS) {
    const findLf = find.replace(/\r\n/g, '\n');
    const restoreLf = restoreTo.replace(/\r\n/g, '\n');
    if (!content.includes(findLf)) {
      console.error(`ABORTING: expected content not found for undo: "${desc}"`);
      console.error('Expected to find:');
      console.error(findLf);
      process.exit(1);
    }
    const occurrences = content.split(findLf).length - 1;
    if (occurrences > 1) {
      console.error(`ABORTING: expected content for "${desc}" appears ${occurrences} times -- not unique.`);
      process.exit(1);
    }
    content = content.replace(findLf, restoreLf);
  }

  fs.writeFileSync(FILE, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Done. Run `npx tsc --noEmit -p .` next to verify.');
}

main();
