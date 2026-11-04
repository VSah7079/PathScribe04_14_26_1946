// src/services/cytology/proficiencyPanel.ts
// Batch 608 (#77): a gynaecological cytology proficiency test (PT) panel the lab
// builds from its answers to a provider's challenge slides, and the SIMULATED
// grading the demo applies to it. A real provider grades the panel and sends the
// result back through the interface engine; until that is connected, the demo
// grades against a built-in key so the whole path can be seen. Every result made
// here is marked simulated and is never a real grade.

export const PT_RESPONSES = ['negative', 'lsil', 'hsil', 'carcinoma', 'unsatisfactory'] as const;
export type PtResponse = (typeof PT_RESPONSES)[number];

export interface PtPanelChallenge {
  slideId: string;
  labResponse: PtResponse | '';
}

export interface PtPanelDraft {
  provider: string;
  eventReference: string;
  challenges: PtPanelChallenge[];
}

export interface PtPanelSubmission extends PtPanelDraft {
  id: string;
  submittedAt: string;
  submittedBy: string;
  status: 'submitted' | 'graded_simulated';
  /** Set once graded (simulated). */
  gradedAt?: string;
  scorePercent?: number;
  outcome?: 'satisfactory' | 'unsatisfactory' | 'no_response';
  /** The answers the demo's key held, shown with the grade. */
  simulatedKey?: Record<string, PtResponse>;
}

/** CAP's gynaecological PT passing score. */
export const PT_PASS_PERCENT = 90;
export const PT_MIN_CHALLENGES = 1;

export function ptPanelProblem(d: PtPanelDraft): 'noProvider' | 'noReference' | 'noChallenges' | 'unanswered' | null {
  if (!d.provider.trim()) return 'noProvider';
  if (!d.eventReference.trim()) return 'noReference';
  if (d.challenges.length < PT_MIN_CHALLENGES) return 'noChallenges';
  if (d.challenges.some(c => !c.slideId.trim() || !c.labResponse)) return 'unanswered';
  return null;
}

/** The demo's key for a slide: a fixed, repeatable answer worked out from the slide ID, so the same panel always grades the same way. */
export function simulatedKeyFor(slideId: string): PtResponse {
  let h = 0;
  for (const ch of slideId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PT_RESPONSES[h % 4]; // never 'unsatisfactory': a key slide is always readable
}

export function gradeSimulatedPanel(p: Pick<PtPanelDraft, 'challenges'>): { scorePercent: number; outcome: 'satisfactory' | 'unsatisfactory' | 'no_response'; key: Record<string, PtResponse> } {
  const answered = p.challenges.filter(c => c.labResponse);
  const key = Object.fromEntries(p.challenges.map(c => [c.slideId, simulatedKeyFor(c.slideId)]));
  if (answered.length === 0) return { scorePercent: 0, outcome: 'no_response', key };
  const right = answered.filter(c => c.labResponse === key[c.slideId]).length;
  const scorePercent = (right / p.challenges.length) * 100;
  return { scorePercent, outcome: scorePercent >= PT_PASS_PERCENT ? 'satisfactory' : 'unsatisfactory', key };
}
