import { describe, it, expect } from 'vitest';
import { configHelpSection, adminGuideAnchorFor, adminGuideAnchorForScreen, adminGuideUrl, adminGuideLanguage, adminGuideAnchorForRoute } from './adminGuideLinks';

describe('adminGuideLinks (Batch 646)', () => {
  it('uses the section id for System and Cytology sections', () => {
    expect(adminGuideAnchorFor({ tab: 'system', section: 'departments' })).toBe('screen-departments');
    expect(adminGuideAnchorFor({ tab: 'cytology', section: 'cytology_routing' })).toBe('screen-cytology_routing');
  });
  it('prefixes the tab for the sub-tabs of the other tabs', () => {
    expect(adminGuideAnchorFor({ tab: 'staff', section: 'roles' })).toBe('screen-staff-roles');
    expect(adminGuideAnchorFor({ tab: 'templates', section: 'parts' })).toBe('screen-templates-parts');
    expect(adminGuideAnchorFor({ tab: 'validation', section: 'dashboard' })).toBe('screen-validation-dashboard');
    expect(adminGuideAnchorFor({ tab: 'protocols', section: 'review' })).toBe('screen-protocols-review');
  });
  it('falls back to the tab itself when no section is open', () => {
    expect(adminGuideAnchorFor({ tab: 'ai' })).toBe('screen-tab-ai');
    expect(adminGuideAnchorFor({ tab: 'system' })).toBe('screen-tab-system');
  });
  it('names screens outside Configuration', () => {
    expect(adminGuideAnchorForScreen('facility-dictionary')).toBe('screen-facility-dictionary');
    expect(adminGuideAnchorForScreen('screen-audit-log')).toBe('screen-audit-log');
  });
  it('builds the redirect address under the app base', () => {
    expect(adminGuideUrl('screen-departments')).toBe('/help/admin-guide/go.html#screen-departments');
    expect(adminGuideUrl('screen-departments', '/app')).toBe('/app/help/admin-guide/go.html#screen-departments');
    expect(adminGuideUrl('screen-departments', '/app/')).toBe('/app/help/admin-guide/go.html#screen-departments');
  });
  it('opens the guide in the language of the app (Batch 647)', () => {
    expect(adminGuideUrl('screen-departments', '/', 'fr')).toBe('/help/admin-guide/fr/go.html#screen-departments');
    expect(adminGuideUrl('screen-departments', '/', 'ko')).toBe('/help/admin-guide/ko/go.html#screen-departments');
    expect(adminGuideUrl('screen-departments', '/app/', 'nl-BE')).toBe('/app/help/admin-guide/nl/go.html#screen-departments');
    expect(adminGuideUrl('screen-departments', '/', 'en')).toBe('/help/admin-guide/go.html#screen-departments');
    expect(adminGuideUrl('screen-departments', '/', 'ja')).toBe('/help/admin-guide/go.html#screen-departments');
    expect(adminGuideLanguage(undefined)).toBe('en');
    expect(adminGuideLanguage('es-MX')).toBe('es');
  });
  it('maps screens outside Configuration to their guide section (Batch 647)', () => {
    expect(adminGuideAnchorForRoute('/audit', '')).toBe('screen-audit-log');
    expect(adminGuideAnchorForRoute('/audit', '?tab=interfaces')).toBe('screen-audit-interfaces');
    expect(adminGuideAnchorForRoute('/audit', '?tab=financial')).toBe('screen-audit-financial');
    expect(adminGuideAnchorForRoute('/audit', '?tab=errors')).toBe('screen-audit-log');
    expect(adminGuideAnchorForRoute('/batch-management/disposal')).toBe('screen-batch-management');
    expect(adminGuideAnchorForRoute('/workstations/embedding/')).toBe('screen-embedding-station');
    expect(adminGuideAnchorForRoute('/configuration')).toBeNull();
    expect(adminGuideAnchorForRoute('/migration-jobs')).toBeNull();
    expect(adminGuideAnchorForRoute('/')).toBeNull();
  });
  it('picks the open section for the Help button', () => {
    expect(configHelpSection('system', 'departments', '')).toBe('departments');
    expect(configHelpSection('protocols', undefined, '?tab=protocols&section=review')).toBe('review');
    expect(configHelpSection('protocols', undefined, '?tab=protocols&section=bogus')).toBe('active');
    expect(configHelpSection('protocols', undefined, '')).toBe('active');
    expect(configHelpSection('ai', undefined, '?tab=ai')).toBeUndefined();
  });
});
