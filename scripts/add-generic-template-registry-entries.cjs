#!/usr/bin/env node
// scripts/add-generic-template-registry-entries.cjs
// ─────────────────────────────────────────────────────────────────────────────
// One-time script: adds PROTOCOL_REGISTRY entries for the 19 generic
// synoptic templates that were seeded into editorStore but never registered
// (see PRIORITY_FIXES.md / protocolShared.tsx's own comment on this).
// Run once, then this script has no further purpose -- not meant to be
// re-run repeatedly.
//
// Usage: node scripts/add-generic-template-registry-entries.cjs
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '..', 'src', 'components', 'Config', 'Protocols', 'protocolShared.tsx');

// [id, name, category, fieldCount]
const TEMPLATES = [
  ['breast_invasive',                    'Generic Template — Breast Invasive',                    'BREAST',     44],
  ['breast_dcis_resection',               'Generic Template — Breast Dcis Resection',              'BREAST',     20],
  ['lung_adeno',                          'Generic Template — Lung Adeno',                         'LUNG',       39],
  ['prostate_needle_biopsy',              'Generic Template — Prostate Needle Biopsy',             'PROSTATE',   34],
  ['colon_resection',                     'Generic Template — Colon Resection',                    'COLON',      46],
  ['skin_melanoma_bx',                    'Generic Template — Skin Melanoma Bx',                   'SKIN',       22],
  ['kidney_resection',                    'Generic Template — Kidney Resection',                   'KIDNEY',     25],
  ['kidney_biopsy',                       'Generic Template — Kidney Biopsy',                      'KIDNEY',     10],
  ['wilms_resection',                     'Generic Template — Wilms Resection',                    'KIDNEY',     32],
  ['wilms_biopsy',                        'Generic Template — Wilms Biopsy',                       'KIDNEY',     8],
  ['prostate_resection',                  'Generic Template — Prostate Resection',                 'PROSTATE',   28],
  ['lung_resection',                      'Generic Template — Lung Resection',                     'LUNG',       22],
  ['breast_surgical_excision',            'Generic Template — Breast Surgical Excision',           'BREAST',     96],
  ['colorectal_resection_b',              'Generic Template — Colorectal Resection B',             'COLORECTAL', 39],
  ['colorectal_local_excision',           'Generic Template — Colorectal Local Excision',          'COLORECTAL', 34],
  ['colorectal_further_investigations',   'Generic Template — Colorectal Further Investigations', 'COLORECTAL', 26],
  ['prostate_biopsy',                     'Generic Template — Prostate Biopsy',                    'PROSTATE',   45],
  ['prostate_radical_prostatectomy',      'Generic Template — Prostate Radical Prostatectomy',     'PROSTATE',   38],
  ['prostate_turp_enucleation',           'Generic Template — Prostate Turp Enucleation',          'PROSTATE',   22],
];

const TODAY = '2026-07-25';

function buildEntry([id, name, category, fields]) {
  return `  {
    id: '${id}', name: '${name}',
    category: '${category}', version: '0.1.0-generic', source: 'Custom', type: 'Base template',
    status: 'published', fields: ${fields}, snomedPct: 0, icdPct: 0,
    lastModified: '${TODAY}', owner: 'System',
  },`;
}

function main() {
  const original = fs.readFileSync(TARGET_FILE, 'utf8');

  const anchor = "id: 'liver_biopsy_medical'";
  const anchorIdx = original.indexOf(anchor);
  if (anchorIdx === -1) {
    console.error(`ABORTING: anchor string "${anchor}" not found. File may have changed -- check manually before re-running.`);
    process.exit(1);
  }

  // Check idempotency -- don't double-insert if already run
  if (original.includes("id: 'breast_invasive'")) {
    console.error('ABORTING: breast_invasive already found in registry -- this script may have already been run. No changes made.');
    process.exit(1);
  }

  // Walk back from the anchor to the start of that object's own line
  // (the "  {" immediately preceding "id: 'liver_biopsy_medical'")
  const linesBefore = original.slice(0, anchorIdx).split('\n');
  linesBefore.pop(); // drop the partial line containing "    id: 'liver_biopsy_medical'"
  let insertionLineIdx = linesBefore.length - 1;
  while (insertionLineIdx >= 0 && linesBefore[insertionLineIdx].trim() !== '{') {
    insertionLineIdx--;
  }
  if (insertionLineIdx < 0) {
    console.error('ABORTING: could not find the opening "{" for the liver_biopsy_medical entry. Check manually.');
    process.exit(1);
  }

  const allLines = original.split('\n');
  const comment = [
    '  // 19 generic templates below -- registered here for the first time (see',
    "  // this file's own comment above: these were seeded into editorStore at",
    '  // module load but never had a PROTOCOL_REGISTRY entry, so they were',
    '  // reachable only by direct URL, invisible to normal browsing/assignment).',
    '  // Content is genericized placeholder (CAP/RCPath-derived structure, no',
    '  // licensed wording) pending a confirmed CAP/RCPath license -- version',
    '  // strings\' "-generic" suffix marks this; will be bumped to a real',
    '  // version number at the same time real licensed content replaces the',
    '  // placeholder options, rather than tracking a separate status for the',
    '  // interim period.',
  ];
  const newEntries = TEMPLATES.map(buildEntry);

  const before = allLines.slice(0, insertionLineIdx);
  const after  = allLines.slice(insertionLineIdx);

  const result = [...before, ...comment, ...newEntries, ...after].join('\n');

  fs.writeFileSync(TARGET_FILE, result, 'utf8');
  console.log(`Inserted ${TEMPLATES.length} PROTOCOL_REGISTRY entries before the liver_biopsy_medical entry.`);
  console.log('Run `npx tsc --noEmit -p .` next to verify.');
}

main();
