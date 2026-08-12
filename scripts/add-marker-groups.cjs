#!/usr/bin/env node
// scripts/add-marker-groups.cjs
// ─────────────────────────────────────────────────────────────────────────────
// One-time script: adds markerGroup tags to the biomarker fields in
// breast_invasive.json and lung_adeno.json, so the MarkersPanel display can
// group related fields (e.g. "ER Status", "ER % Positivity", "ER Intensity")
// under one card instead of showing them as separate, disconnected badges.
//
// Parses and modifies the JSON directly (rather than text/line matching)
// since that's the safest way to edit JSON content -- avoids any
// whitespace/encoding issues entirely. Note: this will reformat the whole
// file via JSON.stringify (2-space indent), so the git diff will show the
// full file as changed, not just the touched lines -- a reasonable
// trade-off for correctness, but worth expecting rather than being
// surprised by a large diff.
//
// Usage: node scripts/add-marker-groups.cjs
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const FILES = [
  {
    file: path.join(__dirname, '..', 'src', 'data', 'templates', 'generic', 'breast_invasive.json'),
    fieldToGroup: {
      er_status: 'ER',
      er_percent_positive: 'ER',
      er_intensity: 'ER',
      pr_status: 'PR',
      pr_percent_positive: 'PR',
      pr_intensity: 'PR',
      her2_ihc_score: 'HER2',
      her2_ish_status: 'HER2',
      ki67_index: 'Ki-67',
    },
  },
  {
    file: path.join(__dirname, '..', 'src', 'data', 'templates', 'generic', 'lung_adeno.json'),
    fieldToGroup: {
      pdl1_tps: 'PD-L1',
      egfr_status: 'EGFR',
      egfr_variant: 'EGFR',
      alk_status: 'ALK',
      ros1_status: 'ROS1',
    },
  },
];

function main() {
  for (const { file, fieldToGroup } of FILES) {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);

    const biomarkerSection = data.sections.find(s => s.id === 'biomarkers');
    if (!biomarkerSection) {
      console.error(`ABORTING: no "biomarkers" section found in ${file}.`);
      process.exit(1);
    }

    let tagged = 0;
    for (const field of biomarkerSection.fields) {
      const group = fieldToGroup[field.id];
      if (!group) {
        console.error(`ABORTING: field "${field.id}" in ${file} has no expected markerGroup mapping. Aborting to avoid silently skipping a field.`);
        process.exit(1);
      }
      field.markerGroup = group;
      tagged++;
    }

    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`${path.basename(file)}: tagged ${tagged} fields with markerGroup.`);
  }
  console.log('Done. Run `npx tsc --noEmit -p .` next to verify (JSON changes won\'t error there, but confirms nothing else broke).');
}

main();
