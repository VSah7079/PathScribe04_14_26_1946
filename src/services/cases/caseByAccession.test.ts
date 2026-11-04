// Batch 756 (Pete, Nov 1, 2026, Video 1): a case made on Accession is stored under its internal id (O26-…) but every
// label, scan and screen carries its accession number (S26-…). Before this, the Grossing queue never listed it and no
// cassette or slide scan found it, so the case stopped at Accession.
import { describe, it, expect, beforeEach } from 'vitest';
import type { Case } from '@/types/case/Case';
import { caseByAccessionNumber } from './caseByAccession';

const mk = (id: string, full?: string) => ({ id, accession: full ? { fullAccession: full } : undefined }) as unknown as Case;

describe('caseByAccessionNumber (Batch 756)', () => {
  it('finds the one case whose accession number is the entry, ignoring case and outer spaces', () => {
    const cases = [mk('O26-0031', 'S26-0001'), mk('S26-4680', 'S26-4680')];
    expect(caseByAccessionNumber(cases, ' s26-0001 ')?.id).toBe('O26-0031');
    expect(caseByAccessionNumber(cases, 'S26-4680')?.id).toBe('S26-4680');
  });
  it('finds nothing for an empty entry, an unknown number, or a number two cases share', () => {
    const cases = [mk('O26-0031', 'S26-0001'), mk('O26-0032', 'S26-0001'), mk('O26-0033')];
    expect(caseByAccessionNumber(cases, '')).toBeNull();
    expect(caseByAccessionNumber(cases, 'S26-9999')).toBeNull();
    expect(caseByAccessionNumber(cases, 'S26-0001')).toBeNull();
  });
});

describe('a case made on Accession is found by its accession number (Batch 756)', () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      key: () => null, length: 0,
    };
    localStorage.setItem('pathscribe-user', JSON.stringify({ id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin', firstName: 'Pete', lastName: 'Nimmo', organisationId: 'ORG-DVMC', canViewOrchestration: true }));
  });

  it('getCase, a cassette scan and the Grossing queue all reach it', async () => {
    const { mockOrchestratorCaseService } = await import('./mockOrchestratorCaseService');
    const res = await mockOrchestratorCaseService.getAll();
    const seeded = res.ok ? res.data : [];
    const template = seeded.find(c => c.originHospitalId === 'HOSP-001')!;
    const fresh = {
      ...template, id: 'O26-9756', status: 'accessioned', version: 0,
      accession: { ...template.accession, fullAccession: 'S26-9756', accessionNumber: 'S26-9756' },
      specimens: [{ ...template.specimens[0], label: 'A', blocks: [{ id: 'O26-9756-SP-A-BLOCK-1', label: '1', status: 'Pending', stains: [] }] }],
    } as unknown as Case;
    await mockOrchestratorCaseService.createCase(fresh);

    const { caseRouter } = await import('./CaseRouter');
    expect((await caseRouter.getCase('S26-9756'))?.id).toBe('O26-9756');

    const { resolveMaterialFromScan } = await import('@/utils/resolveMaterialFromScan');
    const scan = await resolveMaterialFromScan('S26-9756-A1');
    expect(scan && { id: scan.caseData.id, displayId: scan.displayId }).toEqual({ id: 'O26-9756', displayId: 'S26-9756-A1' });

    const { waitingToGross } = await import('@/pages/GrossingWorkspacePage/grossingQueue');
    const all = await caseRouter.getAll(undefined, { includeOrchestration: true });
    expect(waitingToGross(all.ok ? all.data : []).map(r => r.accession)).toContain('S26-9756');
  });
});
