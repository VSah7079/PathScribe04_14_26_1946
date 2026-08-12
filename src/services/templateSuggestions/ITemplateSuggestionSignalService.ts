// src/services/templateSuggestions/ITemplateSuggestionSignalService.ts
// ─────────────────────────────────────────────────────────────
// The template-selection analog of narrativeSignals — same real
// precedent (Level 1 AI learning, de-identified, safe to aggregate),
// applied to a different question: not "how much did the pathologist
// edit the AI's drafted text," but "did the pathologist keep the AI's
// suggested template, or pick something else."
//
// No de-identification step is needed here, unlike narrativeSignals —
// nothing captured is or contains clinical narrative text. Only
// template ids/names and a confidence number are ever stored, which
// carry no PHI to begin with.
// ─────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';

export type TemplateSuggestionOutcome =
  | 'accepted'              // AI suggested a template, pathologist used exactly that one
  | 'overridden'            // AI suggested a template, pathologist picked a different one
  | 'dismissed'             // AI suggested a template, pathologist added no synoptic report at all
  | 'manual_no_suggestion'; // No confident suggestion was made; pathologist browsed and picked manually

export interface TemplateSuggestionSignal {
  id:                    string;
  caseId:                string;
  accessionNumber:       string;
  specimenId:            string;

  suggestedTemplateId?:  string;
  suggestedTemplateName?: string;
  suggestedConfidence?:  number;

  chosenTemplateId?:     string;
  chosenTemplateName?:   string;

  outcome:               TemplateSuggestionOutcome;

  subspecialtyId?:       string;
  studyId?:              string;

  capturedAt:            string;
}

export interface TemplateSuggestionStats {
  totalSignals:     number;
  acceptedCount:    number;
  acceptanceRate:   number;
  byTemplate:       Record<string, { suggested: number; accepted: number; overridden: number; dismissed: number }>;
}

export interface ITemplateSuggestionSignalService {
  recordSignal(signal: Omit<TemplateSuggestionSignal, 'id' | 'capturedAt'>): Promise<ServiceResult<void>>;
  getAll(): Promise<ServiceResult<TemplateSuggestionSignal[]>>;
  getByTemplate(templateId: string): Promise<ServiceResult<TemplateSuggestionSignal[]>>;
  getStats(studyId?: string): Promise<ServiceResult<TemplateSuggestionStats>>;
}
