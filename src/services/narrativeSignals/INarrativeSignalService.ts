// src/services/narrativeSignals/INarrativeSignalService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Level 1 AI learning — captures the diff between AI-generated narrative
// text and the pathologist's final edited version at finalisation.
//
// De-identification is applied at capture time — raw clinical text is
// never stored. Only structural patterns and statistics are persisted.
// This makes stored signals safe for aggregation and partner sharing.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { StructuralEditType } from './deidentification';

export interface NarrativeEditSignal {
  id:               string;
  caseId:           string;
  accessionNumber:  string;
  reportTemplateId: string;
  templateName:     string;
  sectionId:        string;
  sectionTitle:     string;

  // ── De-identified text (safe to aggregate and share) ──────────────────────
  /** AI-generated text with clinical values replaced by typed placeholders */
  aiGeneratedClean:    string;
  /** Pathologist final text with clinical values replaced by typed placeholders */
  finalTextClean:      string;
  /** Structural classification of the edit — what KIND of change was made */
  structuralEditType:  StructuralEditType;
  /** Number of value replacements applied during de-identification */
  replacementCount:    number;

  // ── Statistics (always safe) ───────────────────────────────────────────────
  /** 0 = identical, 1 = completely replaced */
  editRatio:        number;
  /** True if pathologist made no changes */
  wasAccepted:      boolean;

  // ── Context (aggregation keys — no PHI) ───────────────────────────────────
  subspecialtyId?:  string;
  /** Validation study this signal belongs to (if captured during a study) */
  studyId?:         string;

  capturedAt:       string;
}

export interface INarrativeSignalService {
  recordSignals(signals: Omit<NarrativeEditSignal, 'id' | 'capturedAt'>[]): Promise<ServiceResult<void>>;
  getAll(): Promise<ServiceResult<NarrativeEditSignal[]>>;
  getByTemplate(reportTemplateId: string): Promise<ServiceResult<NarrativeEditSignal[]>>;
  getByStudy(studyId: string): Promise<ServiceResult<NarrativeEditSignal[]>>;
  getAccepted(reportTemplateId?: string): Promise<ServiceResult<NarrativeEditSignal[]>>;
  getStats(studyId?: string): Promise<ServiceResult<NarrativeSignalStats>>;
}

export interface NarrativeSignalStats {
  totalSignals:      number;
  acceptedCount:     number;
  acceptanceRate:    number;
  bySection:         Record<string, SectionStats>;
  byTemplate:        Record<string, TemplateStats>;
  byEditType:        Record<StructuralEditType, number>;
}

export interface SectionStats {
  total:          number;
  accepted:       number;
  avgEditRatio:   number;
  editTypes:      Record<string, number>;
}

export interface TemplateStats {
  total:    number;
  accepted: number;
}
