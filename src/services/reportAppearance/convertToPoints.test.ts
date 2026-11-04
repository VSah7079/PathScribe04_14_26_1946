// @vitest-environment happy-dom
//
// src/services/reportAppearance/convertToPoints.test.ts
// Batch 612: "Convert to points" for the lab's styles and for a template: permission, the saved result, the audit entry.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReportTemplate } from '../../types/reportPart';
import { getOrgDocumentStyleDefault, getOrgHeaderStyleDefault, getOrgFooterStyleDefault } from '../../components/Config/System/documentStyleConfig';
import { saveLabSetting } from '../labSettings/labSettingsStore';
import {
  convertLabStylesToPoints, convertTemplateToPoints, planLabPointsConversion, planTemplatePointsConversion,
  pointsConversionAuditEntry, REPORT_FONT_UNITS_CONVERTED,
} from './convertToPoints';

const allow = { enforce: vi.fn(async (_c: string) => ({ allowed: true })) };
const deny = { enforce: vi.fn(async (_c: string) => ({ allowed: false })) };
const logEvent = vi.fn(async (_e: unknown) => ({ ok: true as const, data: {} as never }));

const template = (over: Partial<ReportTemplate> = {}): ReportTemplate => ({
  id: 'tmpl-1', name: 'Breast final', specialty: 'breast', status: 'draft', assembly: [], orchestrationEnabled: false,
  institutionId: 'i', createdBy: 'u', createdAt: '', updatedAt: '', version: '1.0.0',
  documentStyle: { body: { position: 'above', fontSize: 10 }, footer: { position: 'above', fontSize: 6 } },
  ...over,
} as ReportTemplate);

describe('lab styles', () => {
  beforeEach(() => { localStorage.clear(); logEvent.mockClear(); allow.enforce.mockClear(); deny.enforce.mockClear(); });

  it('a lab that never set a style starts in points: body 10, header 11 bold, footer 10', () => {
    expect(getOrgDocumentStyleDefault()).toMatchObject({ fontSize: 10, units: 'pt' });
    expect(getOrgHeaderStyleDefault()).toMatchObject({ fontSize: 11, units: 'pt', weight: 'bold' });
    expect(getOrgFooterStyleDefault()).toMatchObject({ fontSize: 10, units: 'pt' });
    expect(planLabPointsConversion().changes).toEqual([]);
  });

  it('a style saved before points keeps being legacy pixels, with the old defaults behind it', () => {
    saveLabSetting('pathscribe_org_document_style_body', { position: 'above', fontFamily: 'Times New Roman', fontSize: 12 });
    saveLabSetting('pathscribe_org_document_style_footer', { position: 'above', fontFamily: 'Arial' });
    expect(getOrgDocumentStyleDefault()).toMatchObject({ fontSize: 12, units: 'legacy_px', fontFamily: 'Times New Roman' });
    expect(getOrgFooterStyleDefault()).toMatchObject({ fontSize: 8, units: 'legacy_px' });
    expect(getOrgHeaderStyleDefault().units).toBe('pt');
  });

  it('converting needs config:report-appearance:manage and changes nothing without it', async () => {
    saveLabSetting('pathscribe_org_document_style_body', { position: 'above', fontSize: 12 });
    const result = await convertLabStylesToPoints({ auditService: { logEvent }, actorName: 'Admin', authorization: deny });
    expect(result).toEqual({ ok: false, code: 'NOT_PERMITTED' });
    expect(deny.enforce).toHaveBeenCalledWith('config:report-appearance:manage');
    expect(getOrgDocumentStyleDefault().units).toBe('legacy_px');
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('converting keeps each number as points, marks the styles, and is audited', async () => {
    saveLabSetting('pathscribe_org_document_style_body', { position: 'above', fontSize: 12 });
    saveLabSetting('pathscribe_org_document_style_footer', { position: 'above', fontSize: 6 });
    const result = await convertLabStylesToPoints({ auditService: { logEvent }, actorName: 'Admin', authorization: allow });
    expect(result.ok).toBe(true);
    expect(getOrgDocumentStyleDefault()).toMatchObject({ fontSize: 12, units: 'pt' });
    expect(getOrgFooterStyleDefault()).toMatchObject({ fontSize: 8, units: 'pt' });
    expect(logEvent).toHaveBeenCalledTimes(1);
    const entry = logEvent.mock.calls[0][0] as { event: string; detail: string; user: string; caseId: null };
    expect(entry.event).toBe(REPORT_FONT_UNITS_CONVERTED);
    expect(entry.detail).toBe('Report font sizes converted to points for the lab document styles: body 12 px (printed 9 pt) -> 12 pt; footer 6 px (printed 7 pt) -> 8 pt.');
    expect(entry.user).toBe('Admin');
    expect(entry.caseId).toBeNull();
  });
});

describe('a template', () => {
  it('lists the sizes that change before anything is saved', () => {
    expect(planTemplatePointsConversion(template()).changes.map(c => `${c.category}:${c.fromSize}->${c.toSize}`)).toEqual(['body:10->10', 'footer:6->8']);
  });

  it('converting saves the template through the template service in points, and is audited', async () => {
    const save = vi.fn(async (t: ReportTemplate) => ({ ok: true as const, data: t }));
    logEvent.mockClear();
    const result = await convertTemplateToPoints(template(), { templateService: { save }, auditService: { logEvent }, actorName: 'Dr. Author' });
    expect(result.ok).toBe(true);
    const saved = save.mock.calls[0][0];
    expect(saved.fontUnits).toBe('pt');
    expect(saved.documentStyle?.body).toMatchObject({ fontSize: 10, units: 'pt' });
    expect(saved.documentStyle?.footer).toMatchObject({ fontSize: 8, units: 'pt' });
    const entry = logEvent.mock.calls[0][0] as { detail: string };
    expect(entry.detail).toContain('template Breast final (tmpl-1)');
    expect(entry.detail).not.toMatch(/patient|case /i);
  });

  it('a save that fails reports it and writes no audit entry', async () => {
    const save = vi.fn(async (_t: ReportTemplate) => ({ ok: false as const, error: 'down' }));
    logEvent.mockClear();
    const result = await convertTemplateToPoints(template(), { templateService: { save }, auditService: { logEvent }, actorName: 'x' });
    expect(result).toEqual({ ok: false, code: 'SAVE_FAILED', error: 'down' });
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('the audit entry is plain English and has no case or patient', () => {
    const e = pointsConversionAuditEntry('template X (t1)', { changes: [], alreadyPoints: false }, 'Pete');
    expect(e).toMatchObject({ type: 'user', event: REPORT_FONT_UNITS_CONVERTED, user: 'Pete', caseId: null });
    expect(e.detail).toBe('Report font sizes converted to points for template X (t1): no sizes needed changing.');
  });
});
