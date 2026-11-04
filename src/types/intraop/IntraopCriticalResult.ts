// src/types/intraop/IntraopCriticalResult.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 399 (Pete: "a dictionary that would map to a critical result flag in
// the UI so it would know to expect a reason"). Each entry is one kind of
// intraoperative critical result: a frozen finding that should reach the
// operating surgeon directly (unexpected malignancy, a positive margin, a
// finding that changes the extent of resection). A specimen matches an entry
// by its frozen category or by a term in its frozen diagnosis.
// Admin-entered data: names and terms are stored as typed, never translated.
// ─────────────────────────────────────────────────────────────────────────────

import type { FrozenCategory } from './IntraoperativeEntry';

export interface IntraopCriticalResultEntry {
  id: string;
  name: string;
  description: string;
  /** Matched as whole words or phrases in the frozen diagnosis, ignoring case. */
  matchTerms: string[];
  /** A specimen with one of these preliminary categories matches. */
  frozenCategories: FrozenCategory[];
  status: 'Active' | 'Inactive';
}

export type NewIntraopCriticalResultEntry = Omit<IntraopCriticalResultEntry, 'id'>;
