// Batch 611 (#189): the production gate checklist (pure).
import { describe, it, expect } from 'vitest';
import { DEFAULT_SMART_CAPTURE_SETTINGS, SMART_CAPTURE_CHECKLIST_IDS, checklistComplete, activationRefusal, withTick, type SmartCaptureSettings } from './smartCaptureSettings';

describe('Smart Capture settings', () => {
  it('starts with the prototype on and production off', () => {
    expect(DEFAULT_SMART_CAPTURE_SETTINGS).toMatchObject({ prototypeEnabled: true, productionActivated: false });
    expect(checklistComplete(DEFAULT_SMART_CAPTURE_SETTINGS)).toBe(false);
    expect(activationRefusal(DEFAULT_SMART_CAPTURE_SETTINGS)).toBe('CHECKLIST_INCOMPLETE');
  });

  it('opens the gate to activation only when every item is ticked', () => {
    let s: SmartCaptureSettings = DEFAULT_SMART_CAPTURE_SETTINGS;
    for (const id of SMART_CAPTURE_CHECKLIST_IDS) s = withTick(s, id, true, 'Admin', 'now') as SmartCaptureSettings;
    expect(checklistComplete(s)).toBe(true);
    expect(activationRefusal(s)).toBeNull();
    expect(s.checklist.legal).toEqual({ by: 'Admin', at: 'now' });
  });

  it('closes production again when an item is unticked, and refuses an unknown item', () => {
    let s: SmartCaptureSettings = DEFAULT_SMART_CAPTURE_SETTINGS;
    for (const id of SMART_CAPTURE_CHECKLIST_IDS) s = withTick(s, id, true, 'A', 'n') as SmartCaptureSettings;
    s = { ...s, productionActivated: true };
    const after = withTick(s, 'privacy', false, 'A', 'n') as SmartCaptureSettings;
    expect(after.productionActivated).toBe(false);
    expect(after.checklist.privacy).toBeUndefined();
    expect(withTick(s, 'nonsense', true, 'A', 'n')).toBe('UNKNOWN_ITEM');
  });
});
