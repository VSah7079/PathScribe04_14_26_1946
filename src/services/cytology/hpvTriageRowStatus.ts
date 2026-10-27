// src/services/cytology/hpvTriageRowStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 629 (PS-174). What an HPV Triage row says about the case's hrHPV result. A result the platform reported as
// Invalid (failed or inhibited assay) is not a negative and not a positive: the case stays in HPV Triage and is never
// eligible for cytology (resolveCytologyTriageState), but the row must say a result came back and needs repeat testing,
// not just "Awaiting", or the bench waits for something that has already failed.
// ─────────────────────────────────────────────────────────────────────────────

export type HpvTriageRowStatus = 'awaitingHpv' | 'hpvInvalid';

export function hpvTriageRowStatus(specimens: readonly { cytologyScreening?: { hpvResult?: string } }[] | undefined): HpvTriageRowStatus {
  return (specimens ?? []).some(sp => sp.cytologyScreening?.hpvResult === 'Invalid') ? 'hpvInvalid' : 'awaitingHpv';
}
