// Batch 621: the shared synoptic prompt keeps the wording suggestSynopticFields always used.
import { describe, it, expect } from 'vitest';
import { buildSynopticFieldsPrompt, SYNOPTIC_FIELDS_SYSTEM } from '../aiIntegration/synopticFieldsPrompt';

describe('buildSynopticFieldsPrompt', () => {
  const fields = [{ id: 'g', label: 'Grade', options: [{ id: 'g1', label: 'One' }] }, { id: 'n', label: 'Note' }];
  it('is the prompt a case being reported has always had (no final diagnosis line)', () => {
    const b = buildSynopticFieldsPrompt({ gross: 'G', microscopic: 'M', ancillary: 'A' }, fields);
    expect(b.system).toBe(SYNOPTIC_FIELDS_SYSTEM);
    expect(b.maxTokens).toBe(1000);
    expect(b.prompt).toBe(`Analyse the following pathology case and suggest answers for each synoptic field.

GROSS: G
MICROSCOPIC: M
ANCILLARY: A

FIELDS (id | label | allowed option ids):
- g | Grade | options: [g1 (One)]
- n | Note | free text

Return JSON: { "field_id": { "value": "option_id_or_string", "confidence": 85, "source": "short quote" } }
Rules:
- value must be an option id when options are listed
- confidence 0–100
- source ≤12 words from the case text
- Only include fields you can answer with confidence ≥30`);
  });
  it('adds a final diagnosis line only when one is given', () => {
    expect(buildSynopticFieldsPrompt({ gross: '', microscopic: 'M', ancillary: '', finalDiagnosis: 'D' }, fields).prompt).toContain('FINAL DIAGNOSIS: D\nGROSS: ');
  });
});
