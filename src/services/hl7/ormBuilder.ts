// src/services/hl7/ormBuilder.ts
// ─────────────────────────────────────────────────────────────
// Assembles a complete ORM^O01 message from our own Case/Specimen/
// HistologyBlock/StainOrder model. One message per Block — each stain
// on that block becomes its own OBR (Observation Request), since
// that's the actual orderable unit (a specific stain request), not the
// block itself.
//
// This is the STANDARD core only. Nothing vendor-specific lives here —
// see adapters/ for where a receiving system's own quirks get applied,
// after this function produces the generic message. That split is
// deliberate: this function can be built and tested now, fully
// independent of ever getting Vantage's actual spec.
// ─────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { HL7MessageContext } from './types';
import {
  buildMSH, buildPID, buildPV1, buildORC, buildOBR, buildSPM, buildNTE,
} from './segmentBuilders';

let messageCounter = 0;
function nextMessageControlId(): string {
  messageCounter += 1;
  return `PSCRB${Date.now()}${messageCounter}`;
}

export interface OrmBuildResult {
  /** The complete, real HL7 message text — segments joined by \r, the
   *  standard HL7 segment terminator (confirmed across every real
   *  example checked; \n alone is not standard-conformant). */
  message: string;
  messageControlId: string;
}

/**
 * Builds one ORM^O01 message for one block's worth of stain orders.
 * Call once per block that needs to go out, not once per case — a case
 * with three blocks needing separate sends is three calls, not one
 * combined message. Real LIS integrations generally expect one
 * orderable unit's worth of information per message for exactly this
 * reason: partial failures (one block's message fails to send) stay
 * isolated rather than taking the whole case down with them.
 */
export function buildOrmO01ForBlock(
  ctx: HL7MessageContext,
  caseData: Pick<Case, 'id' | 'patient'>,
  specimen: Pick<Specimen, 'id' | 'label' | 'collection' | 'container'>,
  block: HistologyBlock,
  timezone: string
): OrmBuildResult {
  const messageControlId = nextMessageControlId();
  const nowIso = new Date().toISOString();
  const placerOrderNumber = `${caseData.id}-${specimen.label}${block.label}`;

  const segments: string[] = [];
  segments.push(buildMSH(ctx, messageControlId, timezone, nowIso));
  segments.push(buildPID({
    mrn: (caseData.patient as any)?.mrn,
    firstName: (caseData.patient as any)?.firstName ?? '',
    lastName: (caseData.patient as any)?.lastName ?? '',
    dateOfBirth: (caseData.patient as any)?.dateOfBirth,
    sex: (caseData.patient as any)?.sex,
  }, timezone));
  segments.push(buildPV1('O'));
  segments.push(buildORC(placerOrderNumber, placerOrderNumber, timezone, nowIso));

  // One SPM for the parent specimen, one for the block itself — see
  // buildSPM's own doc comment for the honest caveat on this specific
  // interpretation of SPM-11.
  segments.push(buildSPM({
    setId: 1,
    specimenId: specimen.id,
    specimenType: 'TISS',
    bodySite: (specimen.collection as any)?.bodySite,
    containerType: (specimen.container as any)?.type,
  }));
  // Collection timestamp as a comment on the specimen SPM, not a
  // numbered field — see buildSPM's own doc comment for why.
  if ((specimen.collection as any)?.collectedAt) {
    segments.push(buildNTE(`Specimen collected: ${(specimen.collection as any).collectedAt}`));
  }
  segments.push(buildSPM({
    setId: 2,
    specimenId: `${specimen.id}-BLOCK-${block.label}`,
    parentSpecimenId: specimen.id,
    specimenType: 'TISS',
    isBlock: true,
  }));

  // One OBR per stain ordered on this block — each stain is its own
  // orderable unit, not a repeating field on one shared order.
  block.stains.forEach((stain, i) => {
    segments.push(buildOBR(
      placerOrderNumber, placerOrderNumber,
      // No real coding system for our internal stain names yet — see
      // buildOBR's own doc comment. A real integration needs an actual
      // crosswalk here, which belongs in a vendor adapter, not this
      // generic core.
      stain.id, stain.stainName,
      timezone, nowIso, i + 1
    ));
  });

  return { message: segments.join('\r'), messageControlId };
}
