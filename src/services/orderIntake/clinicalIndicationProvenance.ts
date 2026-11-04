// src/services/orderIntake/clinicalIndicationProvenance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 714: provenance of the Accession form's Clinical Indication. Pure.
// 'order'           the text is exactly what the ordering system sent
// 'editedFromOrder' it was filled from the order and the accessioner changed it
// 'entered'         typed at the bench (no order text behind it)
// The original order text is kept on the case beside the stored text, so the
// audit trail shows both.
// ─────────────────────────────────────────────────────────────────────────────
import type { ClinicalIndicationSourceId } from './clinicalIndicationFromOrder';
import type { IncomingOrder } from './IOrderIntakeService';

export type ClinicalIndicationOrigin = 'order' | 'entered' | 'editedFromOrder';

/** What an imported order put into the field (null when it had no indication). */
export interface ImportedClinicalIndication {
  text: string;
  /** The order field it came from; undefined when the sender did not say. */
  field?: ClinicalIndicationSourceId;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export function importedClinicalIndication(order: Pick<IncomingOrder, 'clinicalIndication' | 'clinicalIndicationSource'>): ImportedClinicalIndication | null {
  const text = order.clinicalIndication ?? '';
  return norm(text) ? { text, field: order.clinicalIndicationSource } : null;
}

export function clinicalIndicationOrigin(current: string, imported: ImportedClinicalIndication | null): ClinicalIndicationOrigin | null {
  if (imported) return norm(current) === norm(imported.text) ? 'order' : 'editedFromOrder';
  return norm(current) ? 'entered' : null;
}

/** The additive Case.order fields for the stored indication (spread into the order). */
export function clinicalIndicationCaseFields(current: string, imported: ImportedClinicalIndication | null) {
  const origin = clinicalIndicationOrigin(current, imported);
  return {
    clinicalIndicationSource: origin ?? undefined,
    orderClinicalIndication: imported?.text,
    orderClinicalIndicationField: imported?.field,
  };
}
