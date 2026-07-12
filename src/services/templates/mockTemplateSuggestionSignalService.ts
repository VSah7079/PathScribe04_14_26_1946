// src/services/templates/mockTemplateSuggestionSignalService.ts

import type {
  ITemplateSuggestionSignalService,
  TemplateSuggestionSignal,
  TemplateSuggestionStats,
} from './ITemplateSuggestionSignalService';
import { storageGet, storageSet } from '../mockStorage';

const KEY = 'pathscribe_template_suggestion_signals_v1';

function load(): TemplateSuggestionSignal[] {
  const stored = storageGet<TemplateSuggestionSignal[]>(KEY, []);
  if (stored && stored.length > 0) return stored;

  // Seed realistic demo signals for the 5 new cytology templates —
  // same reasoning as narrativeSignals' own seed data: a signal-capture
  // screen with nothing in it yet demonstrates nothing.
  const now = new Date();
  const daysAgo = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt.toISOString(); };

  const SEED: Omit<TemplateSuggestionSignal, 'id'>[] = [
    // Thyroid FNA — high confidence, high acceptance (site match is unambiguous)
    { caseId: 'case-101', accessionNumber: 'S26-5501-CY-001', specimenId: 'spec-101a',
      suggestedTemplateId: 'thyroid_fna_cytology', suggestedTemplateName: 'Thyroid FNA — Bethesda System', suggestedConfidence: 94,
      chosenTemplateId: 'thyroid_fna_cytology', chosenTemplateName: 'Thyroid FNA — Bethesda System',
      outcome: 'accepted', subspecialtyId: 'cytology', capturedAt: daysAgo(9) },
    { caseId: 'case-102', accessionNumber: 'S26-5502-CY-001', specimenId: 'spec-102a',
      suggestedTemplateId: 'thyroid_fna_cytology', suggestedTemplateName: 'Thyroid FNA — Bethesda System', suggestedConfidence: 91,
      chosenTemplateId: 'thyroid_fna_cytology', chosenTemplateName: 'Thyroid FNA — Bethesda System',
      outcome: 'accepted', subspecialtyId: 'cytology', capturedAt: daysAgo(7) },
    // Salivary Gland — one override, since a parotid mass FNA can occasionally
    // get read against a general non-diagnostic-category workflow instead
    { caseId: 'case-103', accessionNumber: 'S26-5503-CY-001', specimenId: 'spec-103a',
      suggestedTemplateId: 'salivary_gland_fna_cytology', suggestedTemplateName: 'Salivary Gland FNA — Milan System', suggestedConfidence: 88,
      chosenTemplateId: 'salivary_gland_fna_cytology', chosenTemplateName: 'Salivary Gland FNA — Milan System',
      outcome: 'accepted', subspecialtyId: 'cytology', capturedAt: daysAgo(6) },
    { caseId: 'case-104', accessionNumber: 'S26-5504-CY-001', specimenId: 'spec-104a',
      suggestedTemplateId: 'salivary_gland_fna_cytology', suggestedTemplateName: 'Salivary Gland FNA — Milan System', suggestedConfidence: 72,
      chosenTemplateId: 'lymph_node_fna_cytology', chosenTemplateName: 'Lymph Node FNA — General Reporting Categories',
      outcome: 'overridden', subspecialtyId: 'cytology', capturedAt: daysAgo(5) },
    // Urine — high acceptance, clear site match
    { caseId: 'case-105', accessionNumber: 'S26-5505-CY-001', specimenId: 'spec-105a',
      suggestedTemplateId: 'urine_cytology', suggestedTemplateName: 'Urine Cytology — Paris System', suggestedConfidence: 90,
      chosenTemplateId: 'urine_cytology', chosenTemplateName: 'Urine Cytology — Paris System',
      outcome: 'accepted', subspecialtyId: 'cytology', capturedAt: daysAgo(4) },
    // Pancreaticobiliary — one dismissed, e.g. a repeat/duplicate specimen on the same case
    { caseId: 'case-106', accessionNumber: 'S26-5506-CY-001', specimenId: 'spec-106a',
      suggestedTemplateId: 'pancreaticobiliary_cytology', suggestedTemplateName: 'Pancreaticobiliary Cytology — Papanicolaou Society System', suggestedConfidence: 85,
      outcome: 'dismissed', subspecialtyId: 'cytology', capturedAt: daysAgo(3) },
    // Lymph node — lower average confidence, matching the honest "no single
    // dominant standard" note in the template itself; one manual pick with
    // no suggestion at all, reflecting a genuinely ambiguous specimen description
    { caseId: 'case-107', accessionNumber: 'S26-5507-CY-001', specimenId: 'spec-107a',
      suggestedTemplateId: 'lymph_node_fna_cytology', suggestedTemplateName: 'Lymph Node FNA — General Reporting Categories', suggestedConfidence: 68,
      chosenTemplateId: 'lymph_node_fna_cytology', chosenTemplateName: 'Lymph Node FNA — General Reporting Categories',
      outcome: 'accepted', subspecialtyId: 'cytology', capturedAt: daysAgo(2) },
    { caseId: 'case-108', accessionNumber: 'S26-5508-CY-001', specimenId: 'spec-108a',
      chosenTemplateId: 'lymph_node_fna_cytology', chosenTemplateName: 'Lymph Node FNA — General Reporting Categories',
      outcome: 'manual_no_suggestion', subspecialtyId: 'cytology', capturedAt: daysAgo(1) },
  ];

  const withIds = SEED.map((s, i) => ({ ...s, id: `tss-${i + 1}` }));
  storageSet(KEY, withIds);
  return withIds;
}

function persist(signals: TemplateSuggestionSignal[]): void {
  storageSet(KEY, signals);
}

const ok = <T>(data: T) => ({ ok: true as const, data });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockTemplateSuggestionSignalService: ITemplateSuggestionSignalService = {
  async recordSignal(signal) {
    await delay();
    const all = load();
    const withId: TemplateSuggestionSignal = {
      ...signal,
      id: `tss-${Date.now()}`,
      capturedAt: new Date().toISOString(),
    };
    persist([...all, withId]);
    return ok(undefined);
  },

  async getAll() {
    await delay();
    return ok([...load()]);
  },

  async getByTemplate(templateId) {
    await delay();
    const all = load();
    return ok(all.filter(s => s.suggestedTemplateId === templateId || s.chosenTemplateId === templateId));
  },

  async getStats(studyId) {
    await delay();
    const all = load().filter(s => !studyId || s.studyId === studyId);
    const byTemplate: TemplateSuggestionStats['byTemplate'] = {};

    for (const s of all) {
      const key = s.suggestedTemplateId ?? s.chosenTemplateId;
      if (!key) continue;
      if (!byTemplate[key]) byTemplate[key] = { suggested: 0, accepted: 0, overridden: 0, dismissed: 0 };
      if (s.suggestedTemplateId) byTemplate[key].suggested += 1;
      if (s.outcome === 'accepted') byTemplate[key].accepted += 1;
      if (s.outcome === 'overridden') byTemplate[key].overridden += 1;
      if (s.outcome === 'dismissed') byTemplate[key].dismissed += 1;
    }

    const acceptedCount = all.filter(s => s.outcome === 'accepted').length;
    const suggestedCount = all.filter(s => s.suggestedTemplateId).length;

    return ok({
      totalSignals:   all.length,
      acceptedCount,
      acceptanceRate: suggestedCount > 0 ? acceptedCount / suggestedCount : 0,
      byTemplate,
    });
  },
};
