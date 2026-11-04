import { describe, it, expect } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { bindPatientManagementException } = await import('./bindPatientManagementException');
const { mockInterfaceExceptionService } = await import('./mockInterfaceExceptionService');
const { mockPatientIndexService } = await import('../patients/mockPatientIndexService');
const { runInboundMessage, prepareInboundSample } = await import('../mockInterfaceEngine/inboundSimulator');

const ctx = { organisationId: 'ORG-BIND', facilityId: 'F', actor: 'T' };
const mk = async (last: string, mrn: string) => (await mockPatientIndexService.resolveOrCreatePatient({
  organisationId: 'ORG-BIND', mrn, assigningAuthority: 'SIMEHR', firstName: 'Bind', lastName: last, dateOfBirth: '1970-01-01',
})).patientId;

describe('bindPatientManagementException', () => {
  it('binds an unresolved A40 by hand, resolves it, and refuses a second try', async () => {
    const r = await runInboundMessage(await prepareInboundSample('A40-unknown', ctx), ctx);
    expect(r.exceptionQueued).toBeTruthy();
    const pending = await mockInterfaceExceptionService.getPending();
    const ex = (pending as any).data.find((e: any) => e.eventType === 'A40' && e.organisationId !== 'x');
    const a = await mk('BindAlpha', 'BA1'); const b = await mk('BindBeta', 'BB1');
    const same = await bindPatientManagementException({ exceptionId: ex.id, sourcePatientId: a, targetPatientId: a, actor: 'T' });
    expect(same.ok).toBe(false);
    const ok = await bindPatientManagementException({ exceptionId: ex.id, sourcePatientId: a, targetPatientId: b, actor: 'T' });
    expect(ok.ok).toBe(true);
    const again = await bindPatientManagementException({ exceptionId: ex.id, sourcePatientId: a, targetPatientId: b, actor: 'T' });
    expect(again.ok).toBe(false);
  });
  it('needs both patients for A40', async () => {
    const r = await bindPatientManagementException({ exceptionId: 'nope', actor: 'T' });
    expect(r.ok).toBe(false);
  });
});
