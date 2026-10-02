// Batch 429: which Configuration sections a person may change, for the screen.
import { describe, expect, it } from 'vitest';
import { CONFIG_SECTION_CAPABILITIES, configSectionAccess, isViewOnlyControlAllowed } from './configSectionAccess';
import { CAPABILITY_CATALOG } from '../authorization/capabilityCatalog';

describe('configSectionAccess (Batch 429)', () => {
  it('a section is editable with any one of its capabilities', () => {
    expect(configSectionAccess('equipment', c => c === 'equipment:maintenance:record').editable).toBe(true);
    expect(configSectionAccess('clients', () => false)).toEqual({ editable: false, needs: ['config:facilities:manage'] });
  });
  it('a section that isn\'t listed is left alone', () => {
    expect(configSectionAccess('terminology', () => false)).toEqual({ editable: true, needs: [] });
  });
  it('every capability named is in the catalog', () => {
    const keys = CAPABILITY_CATALOG.map(c => c.key as string);
    expect(Object.values(CONFIG_SECTION_CAPABILITIES).flat().filter(k => !keys.includes(k))).toEqual([]);
  });
  it('in a view-only section, navigation and closing still work; actions and toggles are blocked', () => {
    expect(isViewOnlyControlAllowed({ tagName: 'BUTTON', className: 'ps-tab-btn active' })).toBe(true);
    expect(isViewOnlyControlAllowed({ tagName: 'BUTTON', className: 'ps-sub-tab-btn' })).toBe(true);
    expect(isViewOnlyControlAllowed({ tagName: 'BUTTON', className: 'ps-st-modal-close' })).toBe(true);
    expect(isViewOnlyControlAllowed({ tagName: 'BUTTON', className: 'x', navMarked: true })).toBe(true);
    expect(isViewOnlyControlAllowed({ tagName: 'BUTTON', className: 'fct-search-clear' })).toBe(true);
    expect(isViewOnlyControlAllowed({ tagName: 'BUTTON', className: 'ps-conf-btn-primary' })).toBe(false);
    expect(isViewOnlyControlAllowed({ tagName: 'BUTTON', className: 'ps-conf-btn-row' })).toBe(false);
    expect(isViewOnlyControlAllowed({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(isViewOnlyControlAllowed({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(isViewOnlyControlAllowed({ tagName: 'SELECT' })).toBe(true);
  });
  it('Batch 430: in a view-only section, only search and filter fields take changes', () => {
    expect(isViewOnlyControlAllowed({ tagName: 'SELECT', className: 'ps-conf-select' }, 'change')).toBe(false);
    expect(isViewOnlyControlAllowed({ tagName: 'INPUT', type: 'number', className: 'ps-retention__input' }, 'change')).toBe(false);
    expect(isViewOnlyControlAllowed({ tagName: 'SELECT', className: 'ps-conf-select', navMarked: true }, 'change')).toBe(true);
    expect(isViewOnlyControlAllowed({ tagName: 'INPUT', type: 'text', className: 'ps-conf-search' }, 'change')).toBe(true);
    expect(isViewOnlyControlAllowed({ tagName: 'INPUT', type: 'search', className: '' }, 'change')).toBe(true);
  });
});
