// Batch 758: the Microtome's print mode, apart from Grossing's.
import { describe, it, expect } from 'vitest';
import { microtomePrintModeOf } from './microtomePrintMode';
import { MICROTOME_PRINT_BEHAVIORS } from './IPrintSettingsService';

describe('microtomePrintModeOf (Batch 758)', () => {
  it('uses the Microtome setting when there is one', () => {
    expect(microtomePrintModeOf({ defaultPrintBehavior: 'batch', microtomePrintBehavior: 'block' })).toBe('block');
    expect(microtomePrintModeOf({ defaultPrintBehavior: 'batch', microtomePrintBehavior: 'on_demand' })).toBe('on_demand');
  });
  it('settings saved before Batch 758 follow the Grossing default, as before', () => {
    expect(microtomePrintModeOf({ defaultPrintBehavior: 'batch' })).toBe('batch');
    expect(microtomePrintModeOf({ defaultPrintBehavior: 'on_demand' })).toBe('on_demand');
  });
  it('offers On-Demand, Block and Batch', () => {
    expect([...MICROTOME_PRINT_BEHAVIORS]).toEqual(['on_demand', 'block', 'batch']);
  });
});
