// PS-144 to PS-148 (Batch 438): the shared CAPA recommendation engine.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCapaRecommendationService } from './capaRecommendationService';
import { capaComment, capaOwnerOptions, capaQueueOrder, decisionProblem, findLinkTarget, isLive, qaRecordRecommendation } from './capaRecommendationRules';
import { isClinicallySignificant, revisionRecommendation } from '../reasons/revisionReasonRules';
import type { CapaRecommendation } from '@/types/quality/CapaRecommendation';
import type { SpecimenDeficiency } from '../deficiencies/IDeficiencyService';

const rec = (over: Partial<CapaRecommendation>): CapaRecommendation => ({
  id: 'r1', caseId: 'C1', source: 'qa-discordance', deficiencyTypeId: 'def-x', sourceRecordId: 's1',
  summary: 'why', status: 'pending', createdAt: '2026-10-02T10:00:00Z', createdBy: 'system', ...over,
});
const never = () => false;

describe('capaRecommendationRules', () => {
  it('live: pending, or confirmed with its CAPA still open', () => {
    expect(isLive(rec({}), never)).toBe(true);
    expect(isLive(rec({ status: 'confirmed', deficiencyId: 'd1' }), never)).toBe(true);
    expect(isLive(rec({ status: 'confirmed', deficiencyId: 'd1' }), id => id === 'd1')).toBe(false);
    expect(isLive(rec({ status: 'dismissed' }), never)).toBe(false);
  });
  it('PS-148: a clinically significant correction links to a discordance on the same case, any specimen', () => {
    const discordance = rec({ id: 'disc', source: 'post-signout-discordance', specimenId: 'SP-1' });
    expect(findLinkTarget([discordance], { caseId: 'C1', source: 'clinical-correction', deficiencyTypeId: 'def-clinically-significant-revision' }, never)?.id).toBe('disc');
    expect(findLinkTarget([discordance], { caseId: 'C2', source: 'clinical-correction', deficiencyTypeId: 'def-clinically-significant-revision' }, never)).toBeUndefined();
  });
  it('a dismissed recommendation never absorbs a new event; a discordance does not link to a correction', () => {
    expect(findLinkTarget([rec({ status: 'dismissed' })], { caseId: 'C1', source: 'qa-discordance', deficiencyTypeId: 'def-x' }, never)).toBeUndefined();
    const correction = rec({ source: 'clinical-correction', deficiencyTypeId: 'def-clinically-significant-revision' });
    expect(findLinkTarget([correction], { caseId: 'C1', source: 'post-signout-discordance', deficiencyTypeId: 'def-peer-review-discordance' }, never)).toBeUndefined();
  });
  it('QA record rule: consensus means no CAPA; unresolved always recommends; otherwise the type\'s severities', () => {
    const type = { capaTriggerRule: { triggerSeverities: ['high' as const], deficiencyTypeId: 'def-x' } };
    expect(qaRecordRecommendation({ outcome: 'concordant', activityTypeId: 'a' }, type)).toBeNull();
    expect(qaRecordRecommendation({ outcome: 'discordant', severity: 'high', consensus: 'consensus-reached', activityTypeId: 'a' }, type)).toBeNull();
    expect(qaRecordRecommendation({ outcome: 'discordant', severity: 'low', consensus: 'unresolved', activityTypeId: 'a' }, undefined))
      .toEqual({ source: 'unresolved-disagreement', deficiencyTypeId: 'def-unresolved-peer-disagreement' });
    expect(qaRecordRecommendation({ outcome: 'discordant', severity: 'low', activityTypeId: 'a' }, type)).toBeNull();
    expect(qaRecordRecommendation({ outcome: 'discordant', severity: 'high', activityTypeId: 'a' }, type)).toEqual({ source: 'qa-discordance', deficiencyTypeId: 'def-x' });
  });
  it('decisions: only a pending one; dismissing needs a reason; confirming needs an owner', () => {
    expect(decisionProblem(rec({ status: 'confirmed' }), { kind: 'dismiss', reason: 'x' })).toBe('NOT_PENDING');
    expect(decisionProblem(rec({}), { kind: 'dismiss', reason: '  ' })).toBe('REASON_REQUIRED');
    expect(decisionProblem(rec({}), { kind: 'confirm', assignedTo: '' })).toBe('OWNER_REQUIRED');
    expect(decisionProblem(rec({}), { kind: 'confirm', assignedTo: 'u1' })).toBeNull();
  });
  it('the CAPA comment carries the linked events and the note; owners are active staff by name; pending first', () => {
    expect(capaComment(rec({ linkedEvents: [{ source: 'clinical-correction', sourceRecordId: 'a', summary: 'amended', at: 'x' }] }), ' look ')).toBe('why Linked: amended QA lead: look');
    expect(capaOwnerOptions([{ id: '2', firstName: 'Zoe', lastName: 'B' }, { id: '1', firstName: 'Al', lastName: 'C' }, { id: '3', firstName: 'X', lastName: 'Y', status: 'Inactive' }]).map(o => o.id)).toEqual(['1', '2']);
    const order = capaQueueOrder([rec({ id: 'd', status: 'dismissed', decidedAt: '2026-10-03' }), rec({ id: 'p2', createdAt: '2026-10-02' }), rec({ id: 'p1', createdAt: '2026-10-01' })], true);
    expect(order.map(r => r.id)).toEqual(['p1', 'p2', 'd']);
    expect(capaQueueOrder(order, false).map(r => r.id)).toEqual(['p1', 'p2']);
  });
});

describe('PS-146: clinically significant revision reasons', () => {
  it('the starting values: diagnostic amendments yes, clerical corrections no; a lab\'s own value wins', () => {
    expect(isClinicallySignificant({ id: 'AMEND_DIAG' })).toBe(true);
    expect(isClinicallySignificant({ id: 'CORR_TYPO' })).toBe(false);
    expect(isClinicallySignificant({ id: 'AMEND_DIAG', clinicallySignificant: false })).toBe(false);
    expect(isClinicallySignificant({ id: 'CORR_SPEC', clinicallySignificant: true })).toBe(true);
  });
  it('an addendum never recommends; a significant amendment or correction does', () => {
    const reason = { id: 'AMEND_STAGE', name: 'Pathologic Staging Change' };
    expect(revisionRecommendation({ id: 'a1', caseId: 'C1', type: 'addendum' }, reason, 'u')).toBeNull();
    expect(revisionRecommendation({ id: 'a1', caseId: 'C1', type: 'amendment' }, { id: 'CORR_TYPO', name: 'Typo' }, 'u')).toBeNull();
    expect(revisionRecommendation({ id: 'a1', caseId: 'C1', type: 'amendment' }, reason, 'u'))
      .toMatchObject({ source: 'clinical-correction', deficiencyTypeId: 'def-clinically-significant-revision', sourceRecordId: 'a1' });
  });
});

describe('createCapaRecommendationService', () => {
  const setup = (allowed = true) => {
    let store: CapaRecommendation[] = [];
    const deficiencies: SpecimenDeficiency[] = [];
    const audit = vi.fn(async () => {});
    const raise = vi.fn(async (d: Parameters<typeof svc.confirm>[1] & Record<string, unknown>) => {
      const created = { ...d, id: `def-${deficiencies.length + 1}`, status: 'open', raisedAt: 'now' } as unknown as SpecimenDeficiency;
      deficiencies.push(created);
      return { ok: true as const, data: created };
    });
    const svc = createCapaRecommendationService({
      load: () => store, persist: all => { store = all; },
      deficiencies: { getAll: async () => ({ ok: true, data: deficiencies }), raise: raise as never },
      audit, enforce: async () => ({ allowed }), actor: () => ({ id: 'qa1', name: 'QA Lead' }),
      now: () => new Date('2026-10-02T12:00:00Z'), newId: (() => { let n = 0; return () => `rec-${++n}`; })(),
    });
    return { svc, audit, raise, deficiencies, get store() { return store; } };
  };
  const input = { caseId: 'C1', source: 'post-signout-discordance' as const, deficiencyTypeId: 'def-peer-review-discordance', sourceRecordId: 'qa1', summary: 'found', createdBy: 'system' };

  it('recommend → pending, audited; nothing opened', async () => {
    const s = setup();
    const r = await s.svc.recommend(input);
    expect(r.ok && r.data.action).toBe('created');
    expect(s.raise).not.toHaveBeenCalled();
    expect(s.audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'CAPA_RECOMMENDED', caseId: 'C1', type: 'system' }));
  });
  it('confirm opens the CAPA, assigned, with the recommendation id; then a correction links to it', async () => {
    const s = setup();
    await s.svc.recommend(input);
    const c = await s.svc.confirm('rec-1', { assignedTo: 'u9', assignedToName: 'Dr. Owner', note: 'check B2' });
    expect(c.ok && c.data).toMatchObject({ status: 'confirmed', deficiencyId: 'def-1', assignedToName: 'Dr. Owner', decidedByName: 'QA Lead' });
    expect(s.raise).toHaveBeenCalledWith(expect.objectContaining({ deficiencyTypeId: 'def-peer-review-discordance', assignedTo: 'u9', capaRecommendationId: 'rec-1', comment: 'found QA lead: check B2' }));
    const link = await s.svc.recommend({ ...input, source: 'clinical-correction', deficiencyTypeId: 'def-clinically-significant-revision', sourceRecordId: 'amend-1', summary: 'amended' });
    expect(link.ok && link.data.action).toBe('linked');
    expect(s.store).toHaveLength(1);
    expect(s.audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'CAPA_RECOMMENDATION_CONFIRMED' }));
  });
  it('dismiss needs a reason and is audited with it; a dismissed one can be recommended afresh', async () => {
    const s = setup();
    await s.svc.recommend(input);
    expect(await s.svc.dismiss('rec-1', ' ')).toEqual({ ok: false, error: 'REASON_REQUIRED' });
    const d = await s.svc.dismiss('rec-1', 'clerical only');
    expect(d.ok && d.data).toMatchObject({ status: 'dismissed', dismissReason: 'clerical only' });
    expect(s.audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'CAPA_RECOMMENDATION_DISMISSED', detail: expect.stringContaining('clerical only') }));
    const again = await s.svc.recommend(input);
    expect(again.ok && again.data.action).toBe('created');
  });
  it('without qa:capa-recommendation:decide nothing changes', async () => {
    const s = setup(false);
    await s.svc.recommend(input);
    expect(await s.svc.confirm('rec-1', { assignedTo: 'u', assignedToName: 'U' })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await s.svc.dismiss('rec-1', 'x')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(s.raise).not.toHaveBeenCalled();
    expect(s.store[0].status).toBe('pending');
  });
});

// Pete's watch-item (Oct 2): developers had already coded auto-open, so a
// guard keeps any trigger from opening a CAPA of these types directly. Only
// the engine's confirm() may raise them.
describe('regression guard: the CAPA triggers recommend, they never open a CAPA', () => {
  const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const files = (dir: string): string[] => readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(n) && !/(\.test\.|__tests__|\.d\.ts$)/.test(p) ? [p] : [];
  });
  const RECOMMEND_ONLY_TYPES = ['def-peer-review-discordance', 'def-clinically-significant-revision', 'def-clinical-pathologic-mismatch', 'def-unresolved-peer-disagreement', 'def-confirmed-high-risk-finding', 'def-outside-consult-discordance'];
  it('no file but the engine raises a deficiency of a CAPA-recommendation type', () => {
    const offenders = files(SRC).filter(f => {
      const text = readFileSync(f, 'utf8');
      return /\.raise(AndResolve)?\(/.test(text) && RECOMMEND_ONLY_TYPES.some(t => text.includes(`'${t}'`))
        // Forward slashes on every OS (Windows paths use backslashes; Batch 444).
        && !f.endsWith('capaRecommendationService.ts') && !f.split(sep).join('/').includes('/deficiencies/');
    }).map(f => relative(SRC, f).split(sep).join('/'));
    expect(offenders).toEqual([]);
  });
  it('the QA activity record service no longer imports the deficiency service', () => {
    const text = readFileSync(join(SRC, 'services/quality/mockQaActivityRecordService.ts'), 'utf8');
    expect(text).not.toMatch(/mockSpecimenDeficiencyService/);
  });
});
