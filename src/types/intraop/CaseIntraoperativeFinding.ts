// src/types/intraop/CaseIntraoperativeFinding.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 652: what an intraoperative (frozen section) session leaves on the case
// when it is merged. Always an INTRAOPERATIVE record: it is kept beside the
// case's own diagnosis, never in it, and the final diagnosis is never changed
// by it. Reconciliation (frozen vs final) reads the session; this is the
// permanent copy the case keeps once the session is merged.
// ─────────────────────────────────────────────────────────────────────────────
import type { FrozenCategory } from './IntraoperativeEntry';
import type { DigitalAsset } from '@/types/case/Material';

export interface CaseIntraoperativeFinding {
  /** Always 'intraoperative': lets any screen or export label it honestly. */
  kind: 'intraoperative';
  /** The intraop session and specimen this was copied from. */
  sessionId: string;
  intraopSpecimenId: string;
  specimenLabel: string;
  /** Free-text frozen-section diagnosis exactly as recorded at the bench. */
  frozenSectionDiagnosis?: string;
  frozenCategory?: FrozenCategory;
  frozenDiagnosisRenderedAt?: string;
  /** Photo links (the session's DigitalAssets; uploaded references, never image bytes). */
  photos: DigitalAsset[];
  carriedAt: string;
  carriedBy: string;
}
