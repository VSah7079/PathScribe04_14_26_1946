// src/services/caseRegistry/mockCaseRegistryService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fresh localStorage-backed module state per test — the mock service reads
// through storageGet/storageSet, so clearing the underlying store between
// tests is what actually resets it (re-importing the module alone would not,
// since ESM module instances are cached).
const store = new Map<string, string>();
vi.mock('../mockStorage', () => ({
  storageGet: (key: string, fallback: any) => {
    const raw = store.get(key);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback));
  },
  storageSet: (key: string, value: any) => {
    store.set(key, JSON.stringify(value));
  },
}));

const { mockCaseRegistryService } = await import('./mockCaseRegistryService');

describe('mockCaseRegistryService', () => {
  beforeEach(() => {
    store.clear();
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('allocates sequential numbers for a seeded organisation', async () => {
    const first = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC');
    const second = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC');
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.data).toMatch(/^DVMC\d{2}-0001$/);
    expect(second.data).toMatch(/^DVMC\d{2}-0002$/);
  });

  it('never crashes for an organisation with no CaseMaskConfig — falls back to O{YEAR:2}-{SEQ:4}', async () => {
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DOES-NOT-EXIST');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatch(/^O\d{2}-0001$/);
    expect(console.info).toHaveBeenCalled();
  });

  it('two different unconfigured organisations get independent fallback sequences, not a shared one', async () => {
    const a1 = await mockCaseRegistryService.allocateNextCaseNumber('ORG-UNCONFIGURED-A');
    const b1 = await mockCaseRegistryService.allocateNextCaseNumber('ORG-UNCONFIGURED-B');
    const a2 = await mockCaseRegistryService.allocateNextCaseNumber('ORG-UNCONFIGURED-A');
    expect(a1.ok && b1.ok && a2.ok).toBe(true);
    if (!a1.ok || !b1.ok || !a2.ok) return;
    expect(a1.data).toMatch(/-0001$/);
    expect(b1.data).toMatch(/-0001$/); // starts at 1 independently, not 2
    expect(a2.data).toMatch(/-0002$/); // A's own sequence continued correctly
  });

  it('resolves a site prefix from sitePrefixMap when siteId is provided (a real, supported feature — just not used by MFT anymore, which now runs a unified sequence)', async () => {
    await mockCaseRegistryService.saveConfig({
      organisationId: 'ORG-TEST-MULTISITE', prefix: 'TST',
      sitePrefixMap: { 'SITE-A': 'STA', 'SITE-B': 'STB' },
      maskPattern: '{PREFIX}{YEAR:2}-{SEQ:4}', sequenceDigits: 4,
      currentSequence: 0, resetSequenceAnnually: true, lastResetYear: 2026,
      updatedBy: 'test', updatedAt: new Date().toISOString(),
    });
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-TEST-MULTISITE', 'SITE-A');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatch(/^STA\d{2}-0001$/);
  });

  it('falls back to the organisation base prefix when siteId has no entry in sitePrefixMap', async () => {
    await mockCaseRegistryService.saveConfig({
      organisationId: 'ORG-TEST-MULTISITE', prefix: 'TST',
      sitePrefixMap: { 'SITE-A': 'STA', 'SITE-B': 'STB' },
      maskPattern: '{PREFIX}{YEAR:2}-{SEQ:4}', sequenceDigits: 4,
      currentSequence: 0, resetSequenceAnnually: true, lastResetYear: 2026,
      updatedBy: 'test', updatedAt: new Date().toISOString(),
    });
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-TEST-MULTISITE', 'SITE-UNKNOWN');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatch(/^TST\d{2}-0001$/);
  });

  it('MFT runs a unified sequence — same prefix regardless of which real site is passed', async () => {
    const mri = await mockCaseRegistryService.allocateNextCaseNumber('ORG-MFT', 'SITE-MRI');
    const wyt = await mockCaseRegistryService.allocateNextCaseNumber('ORG-MFT', 'SITE-WYTH');
    expect(mri.ok && wyt.ok).toBe(true);
    if (!mri.ok || !wyt.ok) return;
    // Same prefix, sequence continues across sites — not fragmented per site.
    expect(mri.data).toMatch(/^MFT\d{2}-0001$/);
    expect(wyt.data).toMatch(/^MFT\d{2}-0002$/);
  });

  it('falls back to the organisation base prefix when no siteId is given at all', async () => {
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-MFT');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatch(/^MFT\d{2}-0001$/);
  });

  it('resets the sequence to 1 when lastResetYear is in the past and resetSequenceAnnually is true', async () => {
    await mockCaseRegistryService.saveConfig({
      organisationId: 'ORG-DVMC', prefix: 'DVMC',
      maskPattern: '{PREFIX}{YEAR:2}-{SEQ:4}', sequenceDigits: 4,
      currentSequence: 47, resetSequenceAnnually: true, lastResetYear: 2020,
      updatedBy: 'test', updatedAt: new Date().toISOString(),
    });
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatch(/-0001$/); // reset, not 0048
  });

  it('does NOT reset when resetSequenceAnnually is false, even with a stale lastResetYear', async () => {
    await mockCaseRegistryService.saveConfig({
      organisationId: 'ORG-DVMC', prefix: 'DVMC',
      maskPattern: '{PREFIX}{YEAR:2}-{SEQ:4}', sequenceDigits: 4,
      currentSequence: 47, resetSequenceAnnually: false, lastResetYear: 2020,
      updatedBy: 'test', updatedAt: new Date().toISOString(),
    });
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatch(/-0048$/); // continued, not reset
  });

  it('previewNextCaseNumber shows the next number WITHOUT consuming it', async () => {
    const preview1 = await mockCaseRegistryService.previewNextCaseNumber('ORG-MPA');
    const preview2 = await mockCaseRegistryService.previewNextCaseNumber('ORG-MPA');
    expect(preview1.ok && preview2.ok).toBe(true);
    if (!preview1.ok || !preview2.ok) return;
    // Same number both times — preview never advances the real counter.
    expect(preview1.data).toBe(preview2.data);

    const allocated = await mockCaseRegistryService.allocateNextCaseNumber('ORG-MPA');
    expect(allocated.ok).toBe(true);
    if (!allocated.ok) return;
    expect(allocated.data).toBe(preview1.data); // what was previewed is exactly what got allocated
  });

  it('respects a custom sequenceDigits width', async () => {
    await mockCaseRegistryService.saveConfig({
      organisationId: 'ORG-HFHS', prefix: 'HFHS',
      maskPattern: '{PREFIX}-{YEAR:4}-{SEQ:6}', sequenceDigits: 6,
      currentSequence: 0, resetSequenceAnnually: true, lastResetYear: 2026,
      updatedBy: 'test', updatedAt: new Date().toISOString(),
    });
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-HFHS');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toBe(`HFHS-${new Date().getFullYear()}-000001`);
  });

  it('no {SPECIMEN_TYPE} token is ever produced or expected — case-level numbering only', async () => {
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).not.toContain('{SPECIMEN_TYPE}');
    expect(res.data).not.toContain('undefined');
  });

  it('a categoryOverride prefix takes precedence and draws from its own independent series', async () => {
    const surgical1 = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC', undefined, { prefix: 'S', numberSeries: 'SURGICAL' });
    const surgical2 = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC', undefined, { prefix: 'S', numberSeries: 'SURGICAL' });
    expect(surgical1.ok && surgical2.ok).toBe(true);
    if (!surgical1.ok || !surgical2.ok) return;
    expect(surgical1.data).toMatch(/^S\d{2}-0001$/);
    expect(surgical2.data).toMatch(/^S\d{2}-0002$/);
  });

  it('two different categoryOverride series at the same organisation never collide with each other or with the org default', async () => {
    const surgical = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC', undefined, { prefix: 'S', numberSeries: 'SURGICAL' });
    const cytology = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC', undefined, { prefix: 'NG', numberSeries: 'CYTOLOGY_NONGYN' });
    const orgDefault = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC');
    expect(surgical.ok && cytology.ok && orgDefault.ok).toBe(true);
    if (!surgical.ok || !cytology.ok || !orgDefault.ok) return;
    // Each starts at 0001 independently — none shares a counter with another.
    expect(surgical.data).toMatch(/^S\d{2}-0001$/);
    expect(cytology.data).toMatch(/^NG\d{2}-0001$/);
    expect(orgDefault.data).toMatch(/^DVMC\d{2}-0001$/);
  });

  it('a categoryOverride with no numberSeries shares the organisation default series (e.g. Frozen Section sharing Surgical\'s series in real usage)', async () => {
    const withPrefixNoSeries = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC', undefined, { prefix: 'DVMC' });
    const orgDefault = await mockCaseRegistryService.allocateNextCaseNumber('ORG-DVMC');
    expect(withPrefixNoSeries.ok && orgDefault.ok).toBe(true);
    if (!withPrefixNoSeries.ok || !orgDefault.ok) return;
    // Shared counter — second call continues the sequence, doesn't restart it.
    expect(withPrefixNoSeries.data).toMatch(/^DVMC\d{2}-0001$/);
    expect(orgDefault.data).toMatch(/^DVMC\d{2}-0002$/);
  });

  it('categoryOverride works even for an organisation with no CaseMaskConfig at all — still gets the category prefix, not the generic O fallback', async () => {
    const res = await mockCaseRegistryService.allocateNextCaseNumber('ORG-TEST-UNCONFIGURED', undefined, { prefix: 'S', numberSeries: 'SURGICAL' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatch(/^S\d{2}-0001$/);
  });

  it('previewNextCaseNumber respects categoryOverride and does not consume its series counter', async () => {
    const preview1 = await mockCaseRegistryService.previewNextCaseNumber('ORG-DVMC', undefined, { prefix: 'CS', numberSeries: 'CONSULTATION' });
    const preview2 = await mockCaseRegistryService.previewNextCaseNumber('ORG-DVMC', undefined, { prefix: 'CS', numberSeries: 'CONSULTATION' });
    expect(preview1.ok && preview2.ok).toBe(true);
    if (!preview1.ok || !preview2.ok) return;
    expect(preview1.data).toBe(preview2.data);
    expect(preview1.data).toMatch(/^CS\d{2}-0001$/);
  });
});
