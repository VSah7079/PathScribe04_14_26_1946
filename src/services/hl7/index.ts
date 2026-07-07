// src/services/hl7/index.ts
// ─────────────────────────────────────────────────────────────
// Single entry point — generates a standard message via ormBuilder,
// then applies whichever adapter is passed in. No transport layer
// here (no MLLP, no actual sending) — this produces message text
// only. Wiring an actual "send" action into the UI, and building the
// transport to carry it, is real follow-up work once there's a
// concrete target to send to.
// ─────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { HL7MessageContext } from './types';
import type { IHL7VendorAdapter } from './adapters/IHL7VendorAdapter';
import { buildOrmO01ForBlock } from './ormBuilder';
import { identityAdapter } from './adapters/identityAdapter';

export { identityAdapter } from './adapters/identityAdapter';
export { vantageAdapter } from './adapters/vantageAdapter';
export type { IHL7VendorAdapter, HL7AdapterContext } from './adapters/IHL7VendorAdapter';
export type { HL7MessageContext } from './types';
export { buildOrmO01ForBlock } from './ormBuilder';
export * from './segmentBuilders';

/**
 * Generates the outbound message for one block, standard core first,
 * then the given adapter's transformation on top. Defaults to
 * identityAdapter (no vendor customization) if none is passed —
 * always produces a real, valid standard message even with nothing
 * vendor-specific configured yet.
 */
export function generateOutboundHL7ForBlock(
  ctx: HL7MessageContext,
  caseData: Pick<Case, 'id' | 'patient'>,
  specimen: Pick<Specimen, 'id' | 'label' | 'collection' | 'container'>,
  block: HistologyBlock,
  adapter: IHL7VendorAdapter = identityAdapter
): { message: string; messageControlId: string; adapterUsed: string } {
  const standard = buildOrmO01ForBlock(ctx, caseData, specimen, block);
  const adapted = adapter.adapt(standard.message, {
    caseId: caseData.id, specimenLabel: specimen.label, blockLabel: block.label,
  });
  return { message: adapted, messageControlId: standard.messageControlId, adapterUsed: adapter.name };
}
