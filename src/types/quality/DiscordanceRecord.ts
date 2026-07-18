// src/types/quality/DiscordanceRecord.ts
// ─────────────────────────────────────────────────────────────────────────────
// A real Frozen-to-Permanent Reconciliation record — replaces the fully
// static mockDiscordant array in QualityTab.tsx's "Frozen vs Final"
// section, which was disconnected from any real case or intraop data.
//
// Deliberately built around discrete categories (FrozenCategory on the
// intraop side, DiscordanceRecord.finalCategory here), not free-text
// diagnosis comparison — two short diagnoses can't reliably self-compare
// for discordance, but two categories from the same small set can. The
// pathologist confirms Delta/Severity/Root Cause themselves; none of
// that is inferred or auto-graded.
// ─────────────────────────────────────────────────────────────────────────────
import type { FrozenCategory } from '../intraop/IntraoperativeEntry';

export type DiscordanceDelta = 'upgrade' | 'downgrade' | 'minor_variance';

/** Mapped onto the existing low/medium/high severity type QualityTab
 *  already renders — Tier 1/2/3 from the clinical framing this was
 *  built from, kept as one system rather than a parallel one.
 *  low = Tier 1 (no clinical impact), medium = Tier 2 (minimal/moderate),
 *  high = Tier 3 (significant — e.g. false negative requiring a second
 *  surgical procedure). */
export type DiscordanceSeverity = 'low' | 'medium' | 'high';

export type DiscordanceRootCause = 'sampling_error' | 'interpretation_error' | 'technical_artifact' | 'other';

export interface DiscordanceRecord {
  id: string;
  caseId: string;
  specimenId: string;
  /** Free-text label for display — e.g. the specimen's own label, not a
   *  formal dictionary category (checked directly: the values QualityTab
   *  already shows, like "Breast Core Bx," don't match any real
   *  Specimen Categories dictionary in this app — they're just display text). */
  caseType: string;
  frozenCategory: FrozenCategory;
  finalCategory: FrozenCategory;
  frozenDx: string;
  finalDx: string;
  delta: DiscordanceDelta;
  severity: DiscordanceSeverity;
  rootCause: DiscordanceRootCause;
  rootCauseNote?: string; // required content when rootCause === 'other'
  recordedAt: string;
  recordedBy: { userId: string; userName: string };
}
