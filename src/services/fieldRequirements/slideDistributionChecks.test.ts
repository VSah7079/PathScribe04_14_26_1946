import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements, FIELD_REQUIREMENT_PAGES, FIELD_GROUP_ORDER } from './fieldRequirementRules';
import {
  slideCheckoutMissing, scannerLoadMissing, slideExceptionMissing, slideReprintMissing, slideDistributionFieldRequired,
  SLIDE_DISTRIBUTION_DEFAULT_REQUIREMENTS, CHECKOUT_TARGET_MISSING,
} from './slideDistributionChecks';

const defaults = resolveFieldRequirements('slideDistribution', {});

describe('slide distribution Field Requirements (Batch 402)', () => {
  it('scanner instrument and reprint reason are locked; everything else is a switch, off by default', () => {
    const byId = Object.fromEntries(FIELD_REQUIREMENT_PAGES.slideDistribution.map(f => [f.id, f.default]));
    expect(byId).toEqual({
      readingPathologist: 'optional', slideFolderId: 'optional', trayNumber: 'optional', courierBagId: 'optional',
      scannerInstrument: 'locked', rackId: 'optional', slotPosition: 'optional', exceptionNote: 'optional', reprintReason: 'locked',
    });
    expect(SLIDE_DISTRIBUTION_DEFAULT_REQUIREMENTS).toEqual(defaults);
    for (const g of ['slideCheckout', 'scannerLoad', 'slideException', 'slideLabelReprint'] as const) expect(FIELD_GROUP_ORDER).toContain(g);
  });

  it('a checkout needs somewhere to go: a pathologist, a pool or any location', () => {
    expect(slideCheckoutMissing({}, defaults)).toEqual([CHECKOUT_TARGET_MISSING]);
    expect(slideCheckoutMissing({ slideFolderId: '  ' }, defaults)).toEqual([CHECKOUT_TARGET_MISSING]);
    expect(slideCheckoutMissing({ pathologistId: 'u1' }, defaults)).toEqual([]);
    expect(slideCheckoutMissing({ subspecialtyId: 'derm' }, defaults)).toEqual([]);
    expect(slideCheckoutMissing({ trayNumber: '7' }, defaults)).toEqual([]);
  });

  it('an organisation can require the recipient and a location; a pool counts as the recipient', () => {
    const strict = resolveFieldRequirements('slideDistribution', { readingPathologist: true, trayNumber: true });
    expect(slideCheckoutMissing({ courierBagId: 'B1' }, strict)).toEqual(['readingPathologist', 'trayNumber']);
    expect(slideCheckoutMissing({ subspecialtyId: 'derm', trayNumber: '7' }, strict)).toEqual([]);
    expect(slideDistributionFieldRequired(strict, 'trayNumber')).toBe(true);
    expect(slideDistributionFieldRequired(defaults, 'trayNumber')).toBe(false);
  });

  it('scanner routing always needs the instrument; rack and slot are switches', () => {
    expect(scannerLoadMissing({}, defaults)).toEqual(['scannerInstrument']);
    expect(scannerLoadMissing({ scannerInstrumentId: 'GT450' }, defaults)).toEqual([]);
    const racked = resolveFieldRequirements('slideDistribution', { rackId: true, slotPosition: true });
    expect(scannerLoadMissing({ scannerInstrumentId: 'GT450', rackId: '102' }, racked)).toEqual(['slotPosition']);
    const tried = resolveFieldRequirements('slideDistribution', { scannerInstrument: false });
    expect(scannerLoadMissing({}, tried)).toEqual(['scannerInstrument']);
  });

  it('an exception note is only asked for when the organisation requires it', () => {
    expect(slideExceptionMissing('', defaults)).toEqual([]);
    const withNote = resolveFieldRequirements('slideDistribution', { exceptionNote: true });
    expect(slideExceptionMissing('  ', withNote)).toEqual(['exceptionNote']);
    expect(slideExceptionMissing('Slide broken in tray', withNote)).toEqual([]);
  });

  it('a label reprint always needs a reason (Pete), which cannot be switched off', () => {
    expect(slideReprintMissing('', defaults)).toEqual(['reprintReason']);
    expect(slideReprintMissing('Smudged Print', defaults)).toEqual([]);
    expect(slideReprintMissing(undefined, resolveFieldRequirements('slideDistribution', { reprintReason: false }))).toEqual(['reprintReason']);
  });
});
