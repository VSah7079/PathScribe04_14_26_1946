// src/services/researchCases/researchCaseSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 728 (Decision 4): where the research-case settings are kept. A lab-wide
// setting in the lab settings store (labSettingsStore.ts: browser storage in
// the demo, the API server in production, PS-345), read synchronously so the
// worklist counts, the disposal queue and the dispatchers can all apply the
// same rule without each loading it. Saving needs config:research-cases:manage
// (checked here) and settings that pass researchSettingsProblems.
// ─────────────────────────────────────────────────────────────────────────────
import { readLabSetting, saveLabSetting } from '../labSettings/labSettingsStore';
import {
  isResearchCase, normaliseResearchSettings, researchSettingsProblems, withoutResearchCases,
  type ResearchCaseLike, type ResearchCaseSettings, type ResearchSettingsProblem,
} from './researchCaseRules';

export const RESEARCH_CASE_SETTINGS_KEY = 'pathscribe_research_case_settings';
export const RESEARCH_CASE_CAPABILITY = 'config:research-cases:manage';

export function getResearchCaseSettings(): ResearchCaseSettings {
  return normaliseResearchSettings(readLabSetting<Partial<ResearchCaseSettings> | null>(RESEARCH_CASE_SETTINGS_KEY, null));
}

export type SaveResearchSettingsResult =
  | { ok: true; settings: ResearchCaseSettings }
  | { ok: false; error: 'NOT_PERMITTED' }
  | { ok: false; error: 'INVALID'; problems: ResearchSettingsProblem[] };

/** Saves the settings after the capability check and validation. Nothing is saved on a refusal. */
export async function saveResearchCaseSettings(draft: ResearchCaseSettings): Promise<SaveResearchSettingsResult> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  const { permitConfigChange } = await import('../authorization/guardConfigWrites');
  if (!(await permitConfigChange(authorizationService.enforce('config:research-cases:manage'), RESEARCH_CASE_CAPABILITY))) return { ok: false, error: 'NOT_PERMITTED' };
  const settings = normaliseResearchSettings(draft);
  const problems = researchSettingsProblems(settings);
  if (problems.length > 0) return { ok: false, error: 'INVALID', problems };
  saveLabSetting(RESEARCH_CASE_SETTINGS_KEY, settings);
  return { ok: true, settings };
}

/** Whether a case is a research case under the lab's current settings. */
export const isResearchCaseNow = (c: ResearchCaseLike | null | undefined): boolean => isResearchCase(c, getResearchCaseSettings());

/** The cases that are not research cases, under the lab's current settings. */
export const withoutResearchCasesNow = <T extends ResearchCaseLike>(cases: readonly T[]): T[] => withoutResearchCases(cases, getResearchCaseSettings());
