import { describe, it, expect } from 'vitest';
import {
  ACCESSION_TWO_COLUMN_MIN_WIDTH_PX,
  ACCESSION_TWO_COLUMN_QUERY,
  isAccessionTabActive,
  resolveAccessionPanels,
  type AccessionTab,
} from './resolveAccessionPanels';

describe('resolveAccessionPanels', () => {
  it('narrow window: one panel at a time, with the step buttons', () => {
    expect(resolveAccessionPanels('case', false)).toEqual({ showCase: true, showSpecimens: false, showOutside: false, showStepButtons: true });
    expect(resolveAccessionPanels('specimens', false)).toEqual({ showCase: false, showSpecimens: true, showOutside: false, showStepButtons: true });
    expect(resolveAccessionPanels('outside_patient', false)).toEqual({ showCase: false, showSpecimens: false, showOutside: true, showStepButtons: true });
  });

  it('wide window: Case & Patient always shows, with Specimens beside it, and no step buttons', () => {
    for (const tab of ['case', 'specimens'] as AccessionTab[]) {
      expect(resolveAccessionPanels(tab, true)).toEqual({ showCase: true, showSpecimens: true, showOutside: false, showStepButtons: false });
    }
  });

  it('wide window: choosing Outside Patient Data replaces Specimens in the right column only', () => {
    expect(resolveAccessionPanels('outside_patient', true)).toEqual({ showCase: true, showSpecimens: false, showOutside: true, showStepButtons: false });
  });

  it('exports the breakpoint and the matching media query', () => {
    expect(ACCESSION_TWO_COLUMN_MIN_WIDTH_PX).toBe(1480);
    expect(ACCESSION_TWO_COLUMN_QUERY).toBe('(min-width: 1480px)');
  });
});

describe('isAccessionTabActive', () => {
  it('narrow window: only the chosen tab is active', () => {
    expect(isAccessionTabActive('case', 'case', false)).toBe(true);
    expect(isAccessionTabActive('specimens', 'case', false)).toBe(false);
    expect(isAccessionTabActive('specimens', 'specimens', false)).toBe(true);
  });

  it('wide window: Case & Patient is always active, and Specimens is active unless Outside is chosen', () => {
    expect(isAccessionTabActive('case', 'specimens', true)).toBe(true);
    expect(isAccessionTabActive('specimens', 'case', true)).toBe(true);
    expect(isAccessionTabActive('specimens', 'outside_patient', true)).toBe(false);
    expect(isAccessionTabActive('outside_patient', 'outside_patient', true)).toBe(true);
    expect(isAccessionTabActive('outside_patient', 'case', true)).toBe(false);
  });
});
