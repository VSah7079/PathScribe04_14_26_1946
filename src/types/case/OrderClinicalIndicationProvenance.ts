// src/types/case/OrderClinicalIndicationProvenance.ts
// Batch 714: where Case.order.clinicalIndication came from. Additive and optional, so cases made before it are unchanged.
// Kept in its own file because Case.ts is over the file-size limit and may not grow (CLAUDE.md rule 10).
import type { ClinicalIndicationSourceId } from '@/services/orderIntake/clinicalIndicationFromOrder';

export interface OrderClinicalIndicationProvenance {
  /** 'order' = as the ordering system sent it; 'editedFromOrder' = filled from the order, then changed at accessioning; 'entered' = typed. */
  clinicalIndicationSource?: 'order' | 'entered' | 'editedFromOrder';
  /** The order's own text, kept unchanged beside an edited `clinicalIndication` for the audit trail. */
  orderClinicalIndication?: string;
  /** The order field that text came from (obr31, orc16, dg1, nte, fhirReasonCode, fhirReasonReference), when known. */
  orderClinicalIndicationField?: ClinicalIndicationSourceId;
}
