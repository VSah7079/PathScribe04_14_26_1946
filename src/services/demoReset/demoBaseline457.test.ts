// @vitest-environment happy-dom
// Batch 457 (Pete): Metro General reports to a cancer registry, so a seeded
// Registry Exception can be resent; and the Molecular Order Queue has orders.
import { beforeEach, describe, expect, it } from 'vitest';
import { resendRegistrySubmission } from '../registrySubmission/resendRegistrySubmission';
import { resendRegistrySubmissionDeps } from '../registrySubmission/registryExceptionsDeps';
import { mockFacilityCancerRegistryOverrideService } from '../cancerRegistry/mockFacilityCancerRegistryOverrideService';
import { mockMolecularOrderOutboundQueueService } from '../molecularOrders/mockMolecularOrderOutboundQueueService';
import { MOLECULAR_ORDER_DEMO_IDS } from '../molecularOrders/molecularOrderDemoSeed';
import { mockCaseService } from '../cases/mockCaseService';
import { writeSessionProfile } from '../auth/sessionProfile';

beforeEach(() => localStorage.clear());
const allowAll = { ...resendRegistrySubmissionDeps, enforce: async () => ({ allowed: true }) };
const PETE = { id: 'PATH-001', name: 'Pete Nimmo' };

describe('Batch 457: Registry Exceptions → Resend works in the demo', () => {
  it('Metro General (c1) reports to the US (NAACCR) cancer registry; other facilities are unchanged', async () => {
    expect((await mockFacilityCancerRegistryOverrideService.getForFacility('c1') as any).data?.overrides).toEqual({ registryId: 'naaccr_us' });
    expect((await mockFacilityCancerRegistryOverrideService.getForFacility('c4') as any).data).toBeNull();
  });

  it('Resend on S26-4405 and S26-4490 now rebuilds from the case and stops only at the validation-instance rule', async () => {
    // Signed in as Pete at Desert Valley, as on the worklist.
    writeSessionProfile({ id: 'PATH-001', name: 'Pete Nimmo', email: 'demo@pathscribe.ai', role: 'superadmin', initials: 'PN', voiceProfile: 'EN-US', organisationId: 'ORG-DVMC', canViewPediatric: true, authMethod: 'password' } as any);
    for (const entryId of ['crq-demo-4405', 'crq-demo-4490']) {
      const r = await resendRegistrySubmission({ queue: 'cancer', entryId }, PETE, allowAll);
      // Before Batch 457 this was "The facility no longer reports to a cancer registry."
      // The demo runs as a validation instance (VITE_APP_ENV is not "production"),
      // which never sends a real case to a registry: registrySendGate.ts.
      expect(r, entryId).toEqual({ outcome: 'notApplicable', message: expect.stringContaining('this is a validation instance') });
    }
  });

  it('the cases carry what the registry requires: ICD-O code, diagnosis and its date', async () => {
    for (const id of ['S26-4405', 'S26-4490']) {
      const c: any = await mockCaseService.getCase(id);
      const data = c?.ok === undefined ? c : c.data;
      expect(data.specimens[0].coding.icdO[0].code).toMatch(/^8500\/[23]$/);
      expect(data.diagnostic.primaryDiagnosis).toBeTruthy();
      expect(data.diagnostic.issuedDate).toBeTruthy();
    }
  });
});

describe('Batch 457: Molecular Order Queue seed', () => {
  it('starts with the HPV orders, including a reflex genotyping order and one failed dispatch', async () => {
    const r: any = await mockMolecularOrderOutboundQueueService.getAll();
    expect(r.data.map((e: any) => e.id).sort()).toEqual([...MOLECULAR_ORDER_DEMO_IDS].sort());
    const reflex = r.data.find((e: any) => e.id === 'mo-demo-5002-reflex');
    expect(reflex.payload).toMatchObject({ assayCode: 'st-hpv-genotyping', orderReason: 'hpv_reflex_genotyping' });
    expect(r.data.filter((e: any) => e.status === 'FAILED').map((e: any) => e.caseId)).toEqual(['S26-4652-CYT-001']);
  });

  it('each order is for a real seeded Pap at Metro General, and the seed survives an enqueue but returns after a reset', async () => {
    const r: any = await mockMolecularOrderOutboundQueueService.getAll();
    for (const e of r.data) {
      const c: any = await mockCaseService.getCase(e.caseId);
      const data = c?.ok === undefined ? c : c.data;
      expect(data?.order?.facilityId, e.caseId).toBe('c1');
    }
    await mockMolecularOrderOutboundQueueService.enqueue({ caseId: 'S26-5003-CYT-001', eventType: 'order.molecular', payload: { accessionNumber: 'S26-5003-CYT-001', specimenLetter: 'A', assayCode: 'st-hpv-highrisk-screen', orderReason: 'protocol_configured', priority: 'Routine' } });
    expect(((await mockMolecularOrderOutboundQueueService.getAll()) as any).data).toHaveLength(MOLECULAR_ORDER_DEMO_IDS.length + 1);
    localStorage.clear();
    expect(((await mockMolecularOrderOutboundQueueService.getAll()) as any).data).toHaveLength(MOLECULAR_ORDER_DEMO_IDS.length);
  });
});
