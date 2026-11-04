// src/services/cytology/mockCytologyProficiencyPanelService.ts
// Batch 608 (#77): the demo's proficiency test panels. Submitting records the
// panel; "apply simulated result" grades it against the demo key and adds a
// result marked simulated to the PT log. Audit entries carry no patient data.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import { mockAuditService } from '../auditlog/mockAuditService';
import { mockCytologyProficiencyTestResultService } from './mockCytologyProficiencyTestResultService';
import { gradeSimulatedPanel, ptPanelProblem, type PtPanelDraft, type PtPanelSubmission } from './proficiencyPanel';

const KEY = 'cytology_pt_panels_v1';
const load = () => storageGet<PtPanelSubmission[]>(KEY, []);
const persist = (d: PtPanelSubmission[]) => storageSet(KEY, d);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export interface ICytologyProficiencyPanelService {
  getAll(): Promise<ServiceResult<PtPanelSubmission[]>>;
  submit(draft: PtPanelDraft, user: { id: string; name: string }): Promise<ServiceResult<PtPanelSubmission>>;
  applySimulatedResult(id: string, user: { id: string; name: string }): Promise<ServiceResult<PtPanelSubmission>>;
}

export const mockCytologyProficiencyPanelService: ICytologyProficiencyPanelService = {
  async getAll() { return ok(load().map(p => ({ ...p }))); },

  async submit(draft, user) {
    const problem = ptPanelProblem(draft);
    if (problem) return { ok: false, error: problem };
    const created: PtPanelSubmission = {
      ...draft, provider: draft.provider.trim(), eventReference: draft.eventReference.trim(),
      id: 'PT_PANEL_' + Date.now(), submittedAt: new Date().toISOString(), submittedBy: user.name, status: 'submitted',
    };
    persist([...load(), created]);
    await mockAuditService.logEvent({
      type: 'user', event: 'Proficiency Test Panel Submitted', detail: `PT panel ${created.eventReference} (${created.provider}) submitted with ${created.challenges.length} challenges.`,
      user: user.name, caseId: null, confidence: null,
    }).catch(() => {});
    return ok({ ...created });
  },

  async applySimulatedResult(id, user) {
    const all = load();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return { ok: false, error: 'notFound' };
    if (all[idx].status !== 'submitted') return { ok: false, error: 'alreadyGraded' };
    const grade = gradeSimulatedPanel(all[idx]);
    const gradedAt = new Date().toISOString();
    const graded: PtPanelSubmission = { ...all[idx], status: 'graded_simulated', gradedAt, scorePercent: grade.scorePercent, outcome: grade.outcome, simulatedKey: grade.key };
    persist([...all.slice(0, idx), graded, ...all.slice(idx + 1)]);
    await mockCytologyProficiencyTestResultService.add({
      caseId: graded.id, accessionNumber: graded.eventReference, provider: graded.provider, challengeReferenceId: graded.eventReference,
      outcome: grade.outcome, scoreDetail: `Simulated grade: ${Math.round(grade.scorePercent)}% (pass mark 90%). Not from the provider.`,
      receivedAt: gradedAt, simulated: true,
    });
    await mockAuditService.logEvent({
      type: 'system', event: 'Proficiency Test Simulated Result Applied', detail: `PT panel ${graded.eventReference} (${graded.provider}) graded by the built-in simulator: ${grade.outcome}. Simulated, not a provider grade.`,
      user: user.name, caseId: null, confidence: null,
    }).catch(() => {});
    return ok({ ...graded });
  },
};
