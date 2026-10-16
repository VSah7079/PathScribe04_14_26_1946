// @vitest-environment happy-dom
// src/services/marginExtraction/mockMarginExtractionService.test.ts
import { describe, it, expect, vi } from 'vitest';

// Same mocking pattern as tumorBoard/mockTumorBoardService.test.ts: this
// service enforces case:margin-exception:resolve (Batch 490) on the two
// mutating exception-queue actions, so tests control the decision
// directly rather than depending on the real role/session wiring.
const { allowed } = vi.hoisted(() => ({ allowed: { current: true } }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async (capability: string) => ({ capability, allowed: allowed.current, grantedBy: [], missingRequirements: [], context: {} })) },
}));

const { mockMarginExtractionService: svc } = await import('./mockMarginExtractionService');

const FIELDS = [
  { id: 'distance_to_crm_mm', label: 'Distance to CRM (mm)', type: 'text' },
  { id: 'distance_to_closest_margin_cm', label: 'Distance to Closest Margin (cm)', type: 'text' },
  { id: 'margin_status', label: 'Margin Status', type: 'dropdown' }, // not a distance field — ignored
];

describe('mockMarginExtractionService.extractAndStore', () => {
  it('stores a shadow attribute for a confidently-parsed field and ignores non-distance fields', async () => {
    const res = await svc.extractAndStore({
      caseId: 'case-1', instanceId: 'inst-1', fields: FIELDS,
      answers: { distance_to_crm_mm: '2mm', margin_status: 'margin_status_opt_1' },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.stored).toHaveLength(1);
    expect(res.data.stored[0]).toMatchObject({ fieldId: 'distance_to_crm_mm', valueMm: 2, approx: 'exact' });
    expect(res.data.exceptions).toHaveLength(0);

    const attrs = await svc.getShadowAttributesForCase('case-1');
    expect(attrs.ok).toBe(true);
    if (attrs.ok) expect(attrs.data).toHaveLength(1);
  });

  it('converts a cm-suffixed field correctly', async () => {
    const res = await svc.extractAndStore({
      caseId: 'case-2', instanceId: 'inst-1', fields: FIELDS,
      answers: { distance_to_closest_margin_cm: '0.5' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.stored[0]).toMatchObject({ valueMm: 5 });
  });

  it('opens an exception for unparseable text instead of a shadow attribute', async () => {
    const res = await svc.extractAndStore({
      caseId: 'case-3', instanceId: 'inst-1', fields: FIELDS,
      answers: { distance_to_crm_mm: 'cannot be assessed' },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.stored).toHaveLength(0);
    expect(res.data.exceptions).toHaveLength(1);
    expect(res.data.exceptions[0]).toMatchObject({ fieldId: 'distance_to_crm_mm', status: 'Pending', reason: 'noNumericToken' });

    const list = await svc.listExceptions({ caseId: 'case-3' });
    expect(list.ok).toBe(true);
    if (list.ok) expect(list.data).toHaveLength(1);
  });

  it('skips a field with no answer at all (nothing to extract or flag)', async () => {
    const res = await svc.extractAndStore({ caseId: 'case-4', instanceId: 'inst-1', fields: FIELDS, answers: {} });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.stored).toHaveLength(0);
      expect(res.data.exceptions).toHaveLength(0);
    }
  });

  it('re-running extraction upserts: a later confident answer clears a prior pending exception', async () => {
    await svc.extractAndStore({ caseId: 'case-5', instanceId: 'inst-1', fields: FIELDS, answers: { distance_to_crm_mm: 'unclear' } });
    const second = await svc.extractAndStore({ caseId: 'case-5', instanceId: 'inst-1', fields: FIELDS, answers: { distance_to_crm_mm: '3mm' } });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.data.stored[0]).toMatchObject({ valueMm: 3 });

    const list = await svc.listExceptions({ caseId: 'case-5', status: 'Pending' });
    expect(list.ok).toBe(true);
    if (list.ok) expect(list.data).toHaveLength(0);

    const attrs = await svc.getShadowAttribute('case-5', 'inst-1', 'distance_to_crm_mm');
    expect(attrs.ok).toBe(true);
    if (attrs.ok) expect(attrs.data?.valueMm).toBe(3);
  });
});

describe('mockMarginExtractionService exception resolution', () => {
  it('resolveException requires the case:margin-exception:resolve capability', async () => {
    const created = await svc.extractAndStore({ caseId: 'case-6', instanceId: 'inst-1', fields: FIELDS, answers: { distance_to_crm_mm: 'n/a' } });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    allowed.current = false;
    const res = await svc.resolveException(created.data.exceptions[0].id, 2, 'u1', 'User One');
    allowed.current = true;
    expect(res.ok).toBe(false);
  });

  it('resolveException tags a value, marks Resolved, and writes a shadow attribute', async () => {
    const created = await svc.extractAndStore({ caseId: 'case-7', instanceId: 'inst-1', fields: FIELDS, answers: { distance_to_crm_mm: 'n/a' } });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const res = await svc.resolveException(created.data.exceptions[0].id, 1.5, 'u1', 'User One');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toMatchObject({ status: 'Resolved', resolvedValueMm: 1.5, resolvedByUserId: 'u1' });

    const attr = await svc.getShadowAttribute('case-7', 'inst-1', 'distance_to_crm_mm');
    expect(attr.ok).toBe(true);
    if (attr.ok) expect(attr.data?.valueMm).toBe(1.5);
  });

  it('dismissException marks Dismissed with a dismissReason and leaves no shadow attribute', async () => {
    const created = await svc.extractAndStore({ caseId: 'case-8', instanceId: 'inst-1', fields: FIELDS, answers: { distance_to_crm_mm: 'n/a' } });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const res = await svc.dismissException(created.data.exceptions[0].id, 'No margin distance applicable for this specimen', 'u1', 'User One');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toMatchObject({ status: 'Dismissed', dismissReason: 'No margin distance applicable for this specimen' });

    const attr = await svc.getShadowAttribute('case-8', 'inst-1', 'distance_to_crm_mm');
    expect(attr.ok).toBe(true);
    if (attr.ok) expect(attr.data).toBeNull();
  });

  it('resolving/dismissing an unknown id fails', async () => {
    const res = await svc.resolveException('does-not-exist', 1, 'u1', 'User One');
    expect(res.ok).toBe(false);
  });
});
