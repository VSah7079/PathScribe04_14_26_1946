// Batch 651: the OPCS-4 lookup reads the labelled demonstration list.
import { describe, it, expect } from 'vitest';
import { searchCodes, setSimulatedCodeFallbackForTests } from '../terminologySearch/codeSearchService';
import { canApplyCode } from './aiCodeSuggestions';

describe('OPCS-4 demonstration lookup', () => {
  it('finds sample codes (labelled Simulated) so an AI-suggested one is not silently dropped, and they cannot be applied', async () => {
    setSimulatedCodeFallbackForTests(true);
    try {
      const hits = await searchCodes('OPCS4', 'J18');
      expect(hits).toEqual([{ code: 'J18', display: 'Cholecystectomy', system: 'OPCS4', hierarchy: 'Simulated' }]);
      expect(await searchCodes('OPCS4', 'hernia')).toHaveLength(1);
      expect(await searchCodes('OPCS4', 'Z99')).toEqual([]);
      expect(canApplyCode({ system: 'OPCS4' })).toBe(false);
      expect(canApplyCode({ system: 'ICD10' })).toBe(true);
    } finally { setSimulatedCodeFallbackForTests(false); }
  });
});

describe('without the simulated fallback', () => {
  it('stays empty (nothing is shown as a real reference)', async () => {
    setSimulatedCodeFallbackForTests(false);
    expect(await searchCodes('OPCS4', 'J18')).toEqual([]);
  });
});
